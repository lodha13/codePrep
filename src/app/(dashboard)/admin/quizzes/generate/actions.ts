
'use server';

import { generateQuiz } from '@/ai/flows/create-quiz-flow';
import { db } from '@/lib/firebase';
import { Question } from '@/types/schema';
import { writeBatch, collection, doc, serverTimestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const GenerateQuizSchema = z.object({
  topic: z.string().min(3, { message: "Topic must be at least 3 characters." }),
  complexity: z.enum(['easy', 'medium', 'hard']),
  numberOfQuestions: z.coerce.number().int().min(1).max(30),
});

export async function generateQuizAction(prevState: any, formData: FormData) {
  try {
    const validatedFields = GenerateQuizSchema.safeParse({
      topic: formData.get('topic'),
      complexity: formData.get('complexity'),
      numberOfQuestions: formData.get('numberOfQuestions'),
    });

    if (!validatedFields.success) {
      return { success: false, message: validatedFields.error.errors.map(e => e.message).join(', ') };
    }

    const { topic, complexity, numberOfQuestions } = validatedFields.data;

    // Call the Genkit flow to generate the quiz content
    const aiResult = await generateQuiz({ topic, complexity, numberOfQuestions });
    
    if (!aiResult || !aiResult.quiz || !aiResult.questions) {
      return { success: false, message: "AI failed to generate quiz content. Please try again." };
    }
    
    const { quiz: quizData, questions: questionsData } = aiResult;

    // --- Persist to Firestore ---
    const batch = writeBatch(db);

    // 1. Create and batch-write all the questions
    const questionsCollection = collection(db, 'questions');
    const questionIds: string[] = [];

    questionsData.forEach((q) => {
        const questionRef = doc(questionsCollection); // Auto-generate ID
        questionIds.push(questionRef.id);
        const questionPayload: Omit<Question, 'id' | 'createdAt'> & { createdAt: any } = {
            ...q,
            // @ts-ignore
            createdAt: serverTimestamp(),
        };
        batch.set(questionRef, questionPayload);
    });

    // 2. Create the quiz document with the generated question IDs
    const quizCollection = collection(db, 'quizzes');
    const quizRef = doc(quizCollection);
    
    batch.set(quizRef, {
        ...quizData,
        questionIds: questionIds,
        isPublic: true, // Default to public
        type: 'assessment',
        createdAt: serverTimestamp(),
        // Mock createdBy until proper user association is implemented
        createdBy: 'ai-generator', 
    });
    
    // Commit all writes to the database
    await batch.commit();

    revalidatePath('/admin/quizzes');
    return { success: true, message: `Successfully generated and saved "${quizData.title}".` };

  } catch (error: any) {
    console.error("Quiz generation failed:", error);
    return { success: false, message: error.message || "An unexpected error occurred during quiz generation." };
  }
}
