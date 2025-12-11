'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { quizzes as mockQuizzes, testResults } from '@/lib/data';
import type { Quiz, TestResult, UserAnswer, QuestionResult, CodingQuestion, Question } from '@/lib/types';
import { evaluateCodeSubmission } from '@/ai/flows/evaluate-code-submission';
import { getFirestore, collection, writeBatch, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { evaluateCodeAgainstTestCases, TestCaseResult } from '@/ai/flows/evaluate-code-against-test-cases';

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

async function evaluateCodingQuestion(code: string, question: CodingQuestion): Promise<{ passed: boolean, feedback: string, score: number, testCaseResults: TestCaseResult[] }> {
    const result = await evaluateCodeAgainstTestCases({
      code,
      language: question.language,
      testCases: question.testCases.map(tc => JSON.stringify(tc))
    });

    const passedCount = result.results.filter(r => r.passed).length;
    const totalTestCases = question.testCases.length;
    const passed = passedCount === totalTestCases;
    const score = totalTestCases > 0 ? (passedCount / totalTestCases) * question.mark : 0;
    
    // We can get more detailed feedback from another flow if needed
    const feedback = passed ? "All test cases passed!" : `${passedCount} out of ${totalTestCases} test cases passed.`;
    
    return { passed, feedback, score, testCaseResults: result.results };
}


export async function submitQuiz(quizId: string, userId: string, answers: UserAnswer[]): Promise<void> {
    const { firestore } = initializeFirebase();
    // In a real app, you would fetch the quiz from firestore here to ensure data integrity
    // For now, we will rely on mock data for question details like `mark` and `answer`
    const quiz = await getQuizById(quizId);
    if (!quiz) {
        throw new Error("Quiz not found");
    }

    let totalScore = 0;
    const questionResults: QuestionResult[] = [];
    const newResultId = doc(collection(firestore, 'testResults')).id;

    for (const userAnswer of answers) {
        const question = quiz.questions.find(q => q.id === userAnswer.questionId);
        if (!question) continue;

        let isCorrect = false;
        let scoreAwarded = 0;
        const questionResultId = doc(collection(firestore, `testResults/${newResultId}/questionResults`)).id;


        if (question.type === 'multiple-choice') {
            if (question.answer === userAnswer.answer) {
                isCorrect = true;
                scoreAwarded = question.mark;
                totalScore += question.mark;
            }
        } else if (question.type === 'coding') {
            const { passed, score } = await evaluateCodingQuestion(userAnswer.answer, question);
            isCorrect = passed; // Only correct if all test cases pass
            scoreAwarded = score;
            totalScore += score;
        }

        questionResults.push({
            id: questionResultId,
            testResultId: newResultId,
            questionId: question.id,
            isCorrect,
            scoreAwarded,
            userAnswer: userAnswer.answer,
        });
    }

    const newResult: Omit<TestResult, 'id'> = {
        quizId,
        userId: userId, // Use authenticated user ID
        submittedAt: new Date().toISOString(), // Use server timestamp in real app
        score: totalScore,
        questionResults: questionResults.map(qr => qr.id), // Store references
    };
    
    const batch = writeBatch(firestore);
    const testResultRef = doc(firestore, "testResults", newResultId);
    batch.set(testResultRef, newResult);

    for(const qr of questionResults) {
        const qrRef = doc(firestore, `testResults/${newResultId}/questionResults`, qr.id);
        batch.set(qrRef, qr);
    }
    
    await batch.commit();
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
        // Validate that each question has a 'mark'
        if (quiz.questions.some(q => typeof q.mark !== 'number')) {
            throw new Error(`One or more questions in quiz '${quiz.title}' is missing a 'mark'.`);
        }

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
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, message: `Invalid JSON format: ${error.errors.map(e => e.message).join(', ')}` };
    }
    if (error instanceof SyntaxError) {
      return { success: false, message: 'Invalid JSON content. Please check for syntax errors.' };
    }
    console.error(error);
    return { success: false, message: `An unexpected error occurred during quiz upload: ${error.message}` };
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
