'use server';

/**
 * @fileOverview An AI-enhanced grading agent for coding submissions.
 *
 * - aiEnhancedGrading - A function that provides feedback on coding submissions using Gemini AI.
 * - AIEnhancedGradingInput - The input type for the aiEnhancedGrading function.
 * - AIEnhancedGradingOutput - The return type for the aiEnhancedGrading function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIEnhancedGradingInputSchema = z.object({
  code: z.string().describe('The code submission to be graded.'),
  language: z.string().describe('The programming language of the code submission.'),
  testCases: z.string().describe('The test cases for the code submission.'),
  skill: z.string().describe('The skill category'),
});
export type AIEnhancedGradingInput = z.infer<typeof AIEnhancedGradingInputSchema>;

const AIEnhancedGradingOutputSchema = z.object({
  feedback: z.string().describe('The AI-generated feedback on the code submission.'),
  correctness: z.string().describe('Feedback on the correctness of the code submission based on test cases.'),
  codeQuality: z.string().describe('Feedback on the code quality of the code submission, including suggestions for improvement.'),
});
export type AIEnhancedGradingOutput = z.infer<typeof AIEnhancedGradingOutputSchema>;

export async function aiEnhancedGrading(input: AIEnhancedGradingInput): Promise<AIEnhancedGradingOutput> {
  return aiEnhancedGradingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiEnhancedGradingPrompt',
  input: {schema: AIEnhancedGradingInputSchema},
  output: {schema: AIEnhancedGradingOutputSchema},
  prompt: `You are an AI-powered code evaluation tool that provides feedback on code submissions. Use the information provided about skill, test cases, and language to evaluate the code submission. Focus on correctness and code quality, and provide suggestions for improvement.

Skill: {{{skill}}}
Language: {{{language}}}
Test Cases: {{{testCases}}}
Code:
{{{code}}}`,
});

const aiEnhancedGradingFlow = ai.defineFlow(
  {
    name: 'aiEnhancedGradingFlow',
    inputSchema: AIEnhancedGradingInputSchema,
    outputSchema: AIEnhancedGradingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
