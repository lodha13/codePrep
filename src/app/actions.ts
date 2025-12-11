'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { quizzes as mockQuizzes, testResults } from '@/lib/data';
import type { Quiz, TestResult, UserAnswer, QuestionResult, CodingQuestion, Question } from '@/lib/types';
import { evaluateCodeSubmission } from '@/ai/flows/evaluate-code-submission';
import { getFirestore, collection, writeBatch, doc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

// Simulate DB calls
export async function getQuizzes(): Promise<Quiz[]> {
  // This is now a mock function, data is fetched client-side from Firestore
  return Promise.resolve([]);
}

export async function getQuizById(id: string): Promise<Quiz | undefined> {
    // This is now a mock function, data is fetched client-side from Firestore
  return Promise.resolve(mockQuizzes.find((quiz) => quiz.id === id));
}

export async function getTestResults(): Promise<TestResult[]> {
    return Promise.resolve(testResults);
}

export async function getTestResultById(id: string): Promise<TestResult | undefined> {
    return Promise.resolve(testResults.find((result) => result.id === id));
}

async function evaluateCodingQuestion(code: string, question: CodingQuestion): Promise<{ passed: boolean, feedback: string, score: number }> {
    const result = await evaluateCodeSubmission({ code, question: question.description });
    
    // Logic to check test cases.
    // THIS IS A SIMULATION. In a real-world scenario, you'd run the code in a sandbox.
    // For now, we'll assume AI gives a good enough estimation.
    // Let's say score > 70 means all test cases passed.
    const passed = result.score > 70;
    
    return { passed, feedback: result.feedback, score: result.score };
}


export async function submitQuiz(quizId: string, answers: UserAnswer[]): Promise<void> {
    const quiz = await getQuizById(quizId);
    if (!quiz) {
        throw new Error("Quiz not found");
    }

    let totalScore = 0;
    const questionResults: QuestionResult[] = [];

    for (const userAnswer of answers) {
        const question = quiz.questions.find(q => q.id === userAnswer.questionId);
        if (!question) continue;

        let isCorrect = false;
        let scoreAwarded = 0;

        if (question.type === 'multiple-choice') {
            if (question.answer === userAnswer.answer) {
                isCorrect = true;
                scoreAwarded = question.mark;
                totalScore += question.mark;
            }
        } else if (question.type === 'coding') {
            const { passed } = await evaluateCodingQuestion(userAnswer.answer, question);
            if(passed){
                isCorrect = true;
                scoreAwarded = question.mark;
                totalScore += question.mark;
            }
        }

        questionResults.push({
            questionId: question.id,
            isCorrect,
            scoreAwarded,
            userAnswer: userAnswer.answer,
        });
    }

    const newResultId = `res-${Date.now()}`;
    const newResult: TestResult = {
        id: newResultId,
        quizId,
        userId: 'user-123', // Mock user ID
        submittedAt: new Date().toISOString(),
        answers,
        score: totalScore,
        questionResults,
    };
    testResults.push(newResult);
    redirect(`/quiz/results/${newResultId}`);
}

export async function seedDatabase() {
  try {
    const { firestore } = initializeFirebase();
    const batch = writeBatch(firestore);

    for (const quiz of mockQuizzes) {
      const { questions, ...quizData } = quiz;
      const quizRef = doc(firestore, 'quizzes', quiz.id);
      batch.set(quizRef, quizData);

      for (const question of questions) {
        const questionRef = doc(firestore, `quizzes/${quiz.id}/questions`, question.id);
        batch.set(questionRef, question);
      }
    }
    await batch.commit();
    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true, message: 'Database seeded successfully!' };
  } catch (error: any) {
    console.error('Error seeding database:', error);
    return { success: false, message: `Failed to seed database: ${error.message}` };
  }
}

const quizUploadSchema = z.array(z.any());

export async function uploadQuizzes(formData: FormData) {
  const jsonContent = formData.get('quizJson') as string;

  try {
    const newQuizzesData = JSON.parse(jsonContent);
    const parsedQuizzes = quizUploadSchema.parse(newQuizzesData);
    
    // In a real app, you would validate and save this to your database.
    // Here, we just add it to our mock data array.
    const { firestore } = initializeFirebase();
    const batch = writeBatch(firestore);

    parsedQuizzes.forEach((quiz: Quiz) => {
        const { questions, ...quizData } = quiz;
        const quizRef = doc(firestore, 'quizzes', quiz.id);
        batch.set(quizRef, quizData);

        if (questions) {
            questions.forEach((question: Question) => {
                const questionRef = doc(firestore, `quizzes/${quiz.id}/questions`, question.id);
                batch.set(questionRef, question);
            });
        }
    });

    await batch.commit();
    
    revalidatePath('/admin/quizzes');
    revalidatePath('/');

    return { success: true, message: 'Quizzes uploaded successfully!' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: `Invalid JSON format: ${error.errors.map(e => e.message).join(', ')}` };
    }
    if (error instanceof SyntaxError) {
      return { success: false, message: 'Invalid JSON content. Please check for syntax errors.' };
    }
    console.error(error);
    return { success: false, message: 'An unexpected error occurred during quiz upload.' };
  }
}

export async function evaluateCodeAction(code: string, question: string) {
    try {
        const result = await evaluateCodeSubmission({ code, question });
        return { success: true, data: result };
    } catch (error) {
        console.error('AI evaluation failed:', error);
        return { success: false, message: 'Failed to get AI evaluation.' };
    }
}
