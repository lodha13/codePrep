'use server';

/**
 * @fileOverview Generates a quiz (multiple choice and code-based questions) from a prompt.
 *
 * - generateQuizFromPrompt - A function that generates a quiz from a prompt.
 * - GenerateQuizFromPromptInput - The input type for the generateQuizFromPrompt function.
 * - GenerateQuizFromPromptOutput - The return type for the generateQuizFromPrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuizFromPromptInputSchema = z.object({
  prompt: z.string().describe('A detailed prompt describing the quiz topic and desired question types.'),
});
export type GenerateQuizFromPromptInput = z.infer<typeof GenerateQuizFromPromptInputSchema>;

const GenerateQuizFromPromptOutputSchema = z.object({
  quizData: z.string().describe('A JSON string containing the quiz data, including multiple choice and code-based questions.'),
});
export type GenerateQuizFromPromptOutput = z.infer<typeof GenerateQuizFromPromptOutputSchema>;

export async function generateQuizFromPrompt(input: GenerateQuizFromPromptInput): Promise<GenerateQuizFromPromptOutput> {
  return generateQuizFromPromptFlow(input);
}

const generateQuizPrompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {schema: GenerateQuizFromPromptInputSchema},
  output: {schema: GenerateQuizFromPromptOutputSchema},
  prompt: `You are an expert quiz generator. Given a prompt, you will generate a quiz in JSON format. The quiz should contain a mix of multiple choice questions and code-based questions. For code-based questions, include a problem description, a code template, and test cases. Make sure the generated JSON is valid and parseable.

Prompt: {{{prompt}}}

Ensure that the quizData is a valid JSON string.`, 
});

const generateQuizFromPromptFlow = ai.defineFlow(
  {
    name: 'generateQuizFromPromptFlow',
    inputSchema: GenerateQuizFromPromptInputSchema,
    outputSchema: GenerateQuizFromPromptOutputSchema,
  },
  async input => {
    const {output} = await generateQuizPrompt(input);
    return output!;
  }
);
