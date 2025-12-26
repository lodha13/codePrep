'use server';

import { z } from 'zod';
import { ai } from '@/ai/genkit';
// Note: The import below confirms you are using the Genkit Google AI plugin
import { googleAI } from '@genkit-ai/google-genai'; 

// Define Zod schemas that match our Firestore types
const TestCaseSchema = z.object({
  input: z.string().describe("The input for the test case."),
  expectedOutput: z.string().describe("The expected output for the test case."),
  isHidden: z.boolean().describe("Whether the test case is hidden from the user."),
});

const QuestionSchema = z.object({
  title: z.string().describe("The title of the question."),
  description: z.string().describe("The question text, in HTML format."),
  type: z.enum(['mcq', 'coding']).describe("The type of question."),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  mark: z.number().describe("The points awarded for a correct answer."),
  options: z.array(z.string()).optional().describe("Array of 4 options for MCQ questions."),
  correctOptionIndex: z.number().optional().describe("The 0-based index of the correct option for MCQ."),
  language: z.string().optional().describe("Programming language for coding questions."),
  starterCode: z.string().optional().describe("Boilerplate code for coding questions."),
  testCases: z.array(TestCaseSchema).optional().describe("Test cases for coding questions."),
});

const QuizDataSchema = z.object({
  title: z.string().describe("A compelling and descriptive title for the quiz."),
  description: z.string().describe("A brief, one-sentence description of the quiz."),
  durationMinutes: z.number().int().describe("The estimated time to complete the quiz in minutes."),
  category: z.string().describe("A relevant category for the quiz topic, e.g., 'Programming', 'DevOps'."),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

const QuizGenerationInputSchema = z.object({
  category: z.string().describe("Main skill category (e.g., Programming, DevOps, Database)"),
  subCategory: z.string().optional().describe("Sub-category for more specific focus"),
  language: z.string().optional().describe("Programming language for coding questions"),
  customPrompt: z.string().optional().describe("Additional context or specific requirements"),
  complexity: z.enum(['easy', 'medium', 'hard']),
  numberOfQuestions: z.number().int(),
  questionType: z.enum(['mcq', 'coding', 'mixed']).describe("Type of questions to generate"),
});
export type QuizGenerationInput = z.infer<typeof QuizGenerationInputSchema>;


const QuizGenerationOutputSchema = z.object({
    quiz: QuizDataSchema,
    questions: z.array(QuestionSchema),
});
export type QuizGenerationOutput = z.infer<typeof QuizGenerationOutputSchema>;


const quizGenerationFlow = ai.defineFlow(
  {
    name: 'quizGenerationFlow',
    inputSchema: QuizGenerationInputSchema,
    outputSchema: QuizGenerationOutputSchema,
  },
  async (input) => {
    // Generate question type instructions based on selection
    let questionTypeInstructions = '';
    if (input.questionType === 'mcq') {
      questionTypeInstructions = '1. Create a quiz with ONLY Multiple Choice Questions (MCQ). Do not include any coding questions.';
    } else if (input.questionType === 'coding') {
      questionTypeInstructions = '1. Create a quiz with ONLY Coding questions. Do not include any MCQ questions.';
    } else { // mixed
      questionTypeInstructions = '1. Create a quiz with a mix of Multiple Choice Questions (MCQ) and Coding questions. Ensure at least 20% of questions are coding questions and 80% are MCQ questions.';
    }

    const promptText = `You are an expert educator and technical assessment creator.
Your task is to generate a high-quality quiz based on the provided parameters.

Category: ${input.category}
${input.subCategory ? `Sub-Category: ${input.subCategory}` : ''}
${input.language ? `Programming Language: ${input.language}` : ''}
${input.customPrompt ? `Custom Requirements: ${input.customPrompt}` : ''}
Complexity: ${input.complexity}
Number of Questions: ${input.numberOfQuestions}
Question Type: ${input.questionType}

Instructions:
${questionTypeInstructions}
2. All questions must be practical and scenario-based. Use code snippets to test theoretical concepts. AVOID purely theoretical questions.
3. CRITICAL: ${input.language ? `You MUST use ${input.language.toUpperCase()} programming language for ALL coding questions and code examples. Do not use any other programming language.` : 'Choose the most appropriate language for the category.'}
4. If MCQ questions, It must have exactly 4 options.
5. Coding questions must have at least 4 test cases, including edge cases. At least 2 test case should be hidden.
6. All descriptions for questions must be in well-formatted HTML. Use <br/> for line breaks and <code><pre>...</pre></code> for code blocks.
7. Assign 1 mark for Multiple Choice Questions (MCQ) and 10 marks for Coding questions. This is a strict rule.
8. Consider the custom requirements/prompt if provided to tailor the questions accordingly.
9. The quiz category should match the provided category, and if a sub-category is provided, focus on that specific area.
10. The final output MUST be a single JSON object that strictly adheres to the following schema:

{
  "quiz": {
    "title": "string",
    "description": "string",
    "durationMinutes": number,
    "category": "string",
    "difficulty": "easy" | "medium" | "hard"
    "language": "${input.language}",
  },
  "questions": [
    {
      "title": "string",
      "description": "string (HTML format)",
      "type": "mcq" | "coding",
      "difficulty": "easy" | "medium" | "hard",
      "mark": number,
      "language": "${input.language}",
      // For MCQ questions:
      "options": ["string", "string", "string", "string"],
      "correctOptionIndex": number,
      // For Coding questions:
      "starterCode": "string",
      "testCases": [
        {
          "input": "string",
          "expectedOutput": "string",
          "isHidden": boolean
        }
      ]
    }
  ]
}

Do not include any text or formatting outside of the JSON object.`;

    const result = await ai.generate({
      // 🐛 FIX: Changed from 'gemini-1.5-flash-latest' to the core Genkit model ID
      model: 'googleai/gemini-2.0-flash',
      prompt: promptText,
      config: { temperature: 0.8 }
    });
    
    if (!result.text) {
      throw new Error('AI failed to generate quiz. The response was empty.');
    }
    
    // Parse JSON response
    let parsedOutput;
    try {
      // Clean the response text to extract JSON
      let cleanText = result.text.trim();
      
      // Remove markdown code blocks if present
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Find JSON object boundaries
      const jsonStart = cleanText.indexOf('{');
      const jsonEnd = cleanText.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
      }
      
      parsedOutput = JSON.parse(cleanText);
    } catch (error) {
      console.error('Failed to parse AI response:', result.text);
      throw new Error('AI response is not valid JSON. Please try again.');
    }
    
    // Return raw parsed output for admin validation
    return parsedOutput;
  }
);


export async function generateQuiz(input: QuizGenerationInput): Promise<QuizGenerationOutput> {
  return quizGenerationFlow(input);
}