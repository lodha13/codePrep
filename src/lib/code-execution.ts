
import { CodingQuestion, TestCase } from "@/types/schema";
import { Buffer } from 'buffer';

export interface TestCaseResult {
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
}

export interface ExecutionResult {
    stdout: string | null;
    stderr: string | null;
    compile_output: string | null;
    message: string | null;
    status: { id: number; description: string };
    time: string;
    memory: number;
    test_case_results?: TestCaseResult[];
    passed_tests?: number;
    total_tests?: number;
}


// Maps our simple language names to Judge0's language IDs
// See https://ce.judge0.com/languages
const LANGUAGE_ID_MAP: Record<CodingQuestion['language'], number> = {
    java: 91, // Java 17
    javascript: 93, // Node.js 18.15.0
    python: 92, // Python 3.11.2
    cpp: 54, // C++ (GCC 9.2.0)
};

/**
 * Extracts the input values from the test case string.
 * This is a simplified parser and may need to be made more robust
 * depending on the complexity of the input format.
 * Example: "nums = [2, 7, 11, 15], target = 9" -> "2 7 11 15\n9"
 */
function parseInput(input: string): string {
    return input
        .split(',')
        .map(part => part.split('=')[1]?.trim() || '')
        .join('\n')
        .replace(/\[/g, '')
        .replace(/\]/g, '');
}

/**
 * Executes user-provided code against a set of test cases using the public Judge0 API.
 * This function is designed to be stateless and relies only on its inputs.
 */
export async function executeCode(
    source_code: string,
    language: CodingQuestion['language'],
    testCases: TestCase[]
): Promise<ExecutionResult> {

    const language_id = LANGUAGE_ID_MAP[language];
    if (!language_id) {
        throw new Error(`Unsupported language: ${language}`);
    }

    const test_case_results: TestCaseResult[] = [];
    let passed_tests = 0;
    
    let totalTime = 0;
    let totalMemory = 0;
    
    // First, check for compilation error separately. This provides a faster feedback loop.
    const compileCheckPayload = {
        source_code: Buffer.from(source_code).toString('base64'),
        language_id: language_id,
    };

    try {
        const compileResponse = await fetch(`https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Using public API, so no key is needed.
                'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
                'X-RapidAPI-Key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY!,
            },
            body: JSON.stringify(compileCheckPayload),
        });

        const compileResult = await compileResponse.json();

        // If there's a compilation error, return immediately.
        if (compileResult.status.id === 6) { // 6 is Compilation Error
            return {
                stdout: null,
                stderr: null,
                compile_output: compileResult.compile_output ? Buffer.from(compileResult.compile_output, 'base64').toString('utf-8') : "Compilation Failed",
                message: "Compilation Error",
                status: compileResult.status,
                time: "0",
                memory: 0,
            };
        }

        // If compilation is successful, proceed to run against test cases.
        for (const tc of testCases) {
            const submissionPayload = {
                ...compileCheckPayload,
                stdin: Buffer.from(parseInput(tc.input)).toString('base64'),
                expected_output: tc.expectedOutput ? Buffer.from(tc.expectedOutput).toString('base64') : undefined,
            };

            const runResponse = await fetch(`https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true`, {
                method: 'POST',
                 headers: {
                    'Content-Type': 'application/json',
                    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
                    'X-RapidAPI-Key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY!,
                },
                body: JSON.stringify(submissionPayload),
            });

            const runResult = await runResponse.json();

            totalTime += parseFloat(runResult.time || "0");
            totalMemory = Math.max(totalMemory, parseFloat(runResult.memory || "0"));

            // Safely access properties and provide fallbacks.
            const actualOutput = (runResult.stdout ? Buffer.from(runResult.stdout, 'base64').toString('utf-8') : "").trim();
            const expectedOutput = (tc.expectedOutput || "").trim();
            
            // Judge0 status ID 3 means "Accepted".
            const isPass = runResult.status.id === 3;

            if (isPass) {
                passed_tests++;
            }

            test_case_results.push({
                input: tc.input,
                expected: expectedOutput,
                actual: actualOutput || (runResult.stderr ? Buffer.from(runResult.stderr, 'base64').toString('utf-8') : "No output"),
                passed: isPass,
            });
            
            // If a non-compilation error occurs (e.g., runtime error), stop processing further test cases.
            if (runResult.status.id > 4) { // Statuses > 4 are various runtime errors
                break;
            }
        }

        const all_passed = passed_tests === testCases.length;

        const finalStatusId = all_passed ? 3 : (test_case_results.find(r => !r.passed)?.passed === false ? 4 : 11);
         const statusDescriptions: Record<number, string> = {
            3: 'Accepted',
            4: 'Wrong Answer',
            11: 'Runtime Error (NZEC)'
            // Add other status descriptions as needed
        };


        return {
            stdout: all_passed ? "All test cases passed!" : null,
            stderr: all_passed ? null : "One or more test cases failed.",
            compile_output: null,
            message: statusDescriptions[finalStatusId] || "Error",
            status: { id: finalStatusId, description: statusDescriptions[finalStatusId] || "Error" },
            time: totalTime.toFixed(3),
            memory: totalMemory,
            passed_tests: passed_tests,
            total_tests: testCases.length,
            test_case_results: test_case_results,
        };

    } catch (error: any) {
        console.error("Error executing code via Judge0:", error);
        return {
            stdout: null,
            stderr: `An unexpected error occurred: ${error.message}`,
            compile_output: null,
            message: "Internal Execution Error",
            status: { id: 13, description: "Internal Error" }, // Judge0's internal error status
            time: "0",
            memory: 0,
        };
    }
}
