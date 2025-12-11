'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { quizzes, testResults } from '@/lib/data';
import type { Quiz, TestResult, UserAnswer } from '@/lib/types';
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

export async function submitQuiz(quizId: string, answers: UserAnswer[]): Promise<void> {
    const newResultId = `res-${Date.now()}`;
    const newResult: TestResult = {
        id: newResultId,
        quizId,
        userId: 'user-123', // Mock user ID
        submittedAt: new Date().toISOString(),
        answers,
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
