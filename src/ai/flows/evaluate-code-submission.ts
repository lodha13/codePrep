'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CodeSubmissionInputSchema = z.object({
  code: z.string().describe("The user's code submission."),
  question: z.string().describe('The original problem description for the coding question.'),
});

const CodeEvaluationOutputSchema = z.object({
  feedback: z.string().describe('Detailed feedback on the code submission, covering correctness, efficiency, and code style.'),
  score: z.number().min(0).max(100).describe('A suggested score out of 100 based on the evaluation.'),
});

export async function evaluateCodeSubmission(input: z.infer<typeof CodeSubmissionInputSchema>): Promise<z.infer<typeof CodeEvaluationOutputSchema>> {
    return evaluateCodeSubmissionFlow(input);
}

const evaluationPrompt = ai.definePrompt({
    name: 'codeEvaluationPrompt',
    input: { schema: CodeSubmissionInputSchema },
    output: { schema: CodeEvaluationOutputSchema },
    prompt: `You are a senior software engineer acting as a technical interviewer. Evaluate the following code submission based on the problem description.

Problem:
{{{question}}}

User's Code Submission:
\`\`\`
{{{code}}}
\`\`\`

Provide detailed feedback on:
1.  **Correctness**: Does the code solve the problem correctly for all edge cases?
2.  **Efficiency**: What is the time and space complexity? Is it optimal?
3.  **Code Quality**: Is the code clean, readable, and well-structured? Are there any best practice violations?

Finally, provide a suggested score from 0 to 100 based on your evaluation. Your entire output must be a valid JSON object matching the defined schema.`,
});

const evaluateCodeSubmissionFlow = ai.defineFlow(
  {
    name: 'evaluateCodeSubmissionFlow',
    inputSchema: CodeSubmissionInputSchema,
    outputSchema: CodeEvaluationOutputSchema,
  },
  async (input) => {
    const { output } = await evaluationPrompt(input);
    if (!output) {
      throw new Error('AI evaluation failed to produce an output.');
    }
    return output;
  }
);
