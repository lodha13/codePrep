'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { quizzes, testResults } from '@/lib/data';
import type { Quiz, TestResult, UserAnswer, QuestionResult, CodingQuestion } from '@/lib/types';
import { evaluateCodeSubmission } from '@/ai/flows/evaluate-code-submission';

// Simulate DB calls
export async function getQuizzes(): Promise<Quiz[]> {
  return Promise.resolve(quizzes);
}

export async function getQuizById(id: string): Promise<Quiz | undefined> {
  return Promise.resolve(quizzes.find((quiz) => quiz.id === id));
}

export async function getTestResults(): Promise<TestResult[]> {
    return Promise.resolve(testResults);
}

export async function getTestResultById(id: string): Promise<TestResult | undefined> {
    return Promise.resolve(testResults.find((result) => result.id === id));
}

async function evaluateCodingQuestion(code: string, question: CodingQuestion): Promise<{ passed: boolean, feedback: string }> {
    // This is a simplified simulation. A real implementation would execute the code against test cases.
    // Here, we'll just use AI to check for correctness conceptually.
    const result = await evaluateCodeSubmission({ code, question: question.description });
    
    // A simple heuristic: if AI score is > 70, assume it passes.
    const passed = result.score > 70;
    return { passed, feedback: result.feedback };
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
            // In a real app, this would involve a secure code execution environment.
            // For now, we simulate with a simple correctness check.
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

const quizUploadSchema = z.array(z.any());

export async function uploadQuizzes(formData: FormData) {
  const jsonContent = formData.get('quizJson') as string;

  try {
    const newQuizzesData = JSON.parse(jsonContent);
    const parsedQuizzes = quizUploadSchema.parse(newQuizzesData);
    
    // In a real app, you would validate and save this to your database.
    // Here, we just add it to our mock data array.
    parsedQuizzes.forEach(q => quizzes.push(q as Quiz));
    
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
    return { success: false, message: 'An unexpected error occurred.' };
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
