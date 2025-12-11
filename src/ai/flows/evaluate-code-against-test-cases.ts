'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TestCaseInputSchema = z.string().describe("A single test case, likely as a stringified JSON object with 'input' and 'expectedOutput'.");

const TestCaseResultSchema = z.object({
  testCase: TestCaseInputSchema,
  passed: z.boolean().describe("Whether the code passed this test case."),
  actualOutput: z.string().describe("The actual output from the code execution for this test case."),
});
export type TestCaseResult = z.infer<typeof TestCaseResultSchema>;

const CodeEvaluationInputSchema = z.object({
  code: z.string().describe("The user's code submission."),
  language: z.string().describe("The programming language of the code."),
  testCases: z.array(TestCaseInputSchema).describe("An array of test cases to evaluate the code against."),
});

const CodeEvaluationOutputSchema = z.object({
  results: z.array(TestCaseResultSchema).describe("The results for each test case."),
});

export async function evaluateCodeAgainstTestCases(input: z.infer<typeof CodeEvaluationInputSchema>): Promise<z.infer<typeof CodeEvaluationOutputSchema>> {
    return evaluateCodeTestCasesFlow(input);
}

const evaluationPrompt = ai.definePrompt({
    name: 'codeAgainstTestCasesPrompt',
    input: { schema: CodeEvaluationInputSchema },
    output: { schema: CodeEvaluationOutputSchema },
    prompt: `You are a code execution engine. Your task is to execute the provided code against a series of test cases and determine if the code's output matches the expected output for each case.

Language: {{{language}}}

Code to Execute:
\`\`\`
{{{code}}}
\`\`\`

Evaluate the code against the following test cases:
{{#each testCases}}
- Test Case: {{{this}}}
{{/each}}

For each test case, you must determine if the code passes. A test case passes only if the actual output exactly matches the expected output. Fill out the 'passed' and 'actualOutput' fields for each result. Your entire output must be a valid JSON object matching the defined schema.`,
});

const evaluateCodeTestCasesFlow = ai.defineFlow(
  {
    name: 'evaluateCodeTestCasesFlow',
    inputSchema: CodeEvaluationInputSchema,
    outputSchema: CodeEvaluationOutputSchema,
  },
  async (input) => {
    const { output } = await evaluationPrompt(input);
    if (!output) {
      throw new Error('AI evaluation against test cases failed to produce an output.');
    }
    return output;
  }
);
