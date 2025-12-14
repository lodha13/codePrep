
'use server';

import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Define Zod schemas that match our Firestore types
const TestCaseSchema = z.object({
  input: z.string().describe("The input for the test case."),
  expectedOutput: z.string().describe("The expected output for the test case."),
  isHidden: z.boolean().describe("Whether the test case is hidden from the user."),
});

const QuestionSchema = z.discriminatedUnion('type', [
  z.object({
    title: z.string().describe("The title of the question."),
    description: z.string().describe("The question text, in HTML format."),
    type: z.literal('mcq'),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    mark: z.literal(1).describe("The points awarded for a correct answer. Always 1 for MCQs."),
    options: z.array(z.string()).min(4).max(4).describe("An array of exactly 4 potential answers."),
    correctOptionIndex: z.number().min(0).max(3).describe("The 0-based index of the correct option."),
  }),
  z.object({
    title: z.string().describe("The title of the coding challenge."),
    description: z.string().describe("A detailed description of the coding challenge, in HTML format."),
    type: z.literal('coding'),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    mark: z.literal(10).describe("The points awarded for a correct answer. Always 10 for coding questions."),
    language: z.literal('java').describe("The programming language for the challenge, always 'java'."),
    starterCode: z.string().describe("The boilerplate code to provide to the user."),
    testCases: z.array(TestCaseSchema).min(3).describe("An array of at least 3 test cases."),
  }),
]);

const QuizDataSchema = z.object({
  title: z.string().describe("A compelling and descriptive title for the quiz."),
  description: z.string().describe("A brief, one-sentence description of the quiz."),
  durationMinutes: z.number().int().describe("The estimated time to complete the quiz in minutes."),
  category: z.string().describe("A relevant category for the quiz topic, e.g., 'Programming', 'DevOps'."),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

const QuizGenerationInputSchema = z.object({
  topic: z.string(),
  complexity: z.enum(['easy', 'medium', 'hard']),
  numberOfQuestions: z.number().int(),
});
export type QuizGenerationInput = z.infer<typeof QuizGenerationInputSchema>;


const QuizGenerationOutputSchema = z.object({
    quiz: QuizDataSchema,
    questions: z.array(QuestionSchema),
});
export type QuizGenerationOutput = z.infer<typeof QuizGenerationOutputSchema>;


const prompt = ai.definePrompt({
  name: 'quizGenerationPrompt',
  input: { schema: QuizGenerationInputSchema },
  output: { schema: QuizGenerationOutputSchema },
  prompt: `You are an expert educator and technical assessment creator specializing in Java.
    Your task is to generate a high-quality quiz based on the provided topic, complexity, and number of questions.

    Topic: {{{topic}}}
    Complexity: {{{complexity}}}
    Number of Questions: {{{numberOfQuestions}}}

    Instructions:
    1.  Create a quiz with a mix of Multiple Choice Questions (MCQ) and Coding questions. For a quiz of 10 or more questions, include at least 2 coding questions.
    2.  All questions must be practical and scenario-based. Use code snippets to test theoretical concepts. AVOID purely theoretical questions.
    3.  All code must be in Java.
    4.  MCQ questions must have exactly 4 options.
    5.  Coding questions must have at least 10 test cases, including edge cases. At least one test case must be hidden.
    6.  All descriptions for questions must be in well-formatted HTML. Use <br/> for line breaks and <code><pre>...</pre></code> for code blocks.
    7.  Assign 1 mark for Multiple Choice Questions (MCQ) and 10 marks for Coding questions. This is a strict rule.
    8.  The final output MUST be a single JSON object that strictly adheres to the provided output schema. Do not include any text or formatting outside of the JSON object.
    `,
    config: {
        model: googleAI.model('gemini-1.5-pro-preview'),
        temperature: 0.8, // Increase creativity for more varied questions
    }
});


const quizGenerationFlow = ai.defineFlow(
  {
    name: 'quizGenerationFlow',
    inputSchema: QuizGenerationInputSchema,
    outputSchema: QuizGenerationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate quiz. The response was empty.');
    }
    // Post-generation validation to ensure marks are correct
    output.questions.forEach(q => {
        if (q.type === 'mcq') q.mark = 1;
        if (q.type === 'coding') q.mark = 10;
    })
    return output;
  }
);


export async function generateQuiz(input: QuizGenerationInput): Promise<QuizGenerationOutput> {
  return quizGenerationFlow(input);
}
