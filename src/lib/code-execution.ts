
import { CodingQuestion } from "@/types/schema";
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
 * Example: "nums = [2,7,11,15], target = 9" -> "2 7 11 15\n9"
 * This parser assumes space-separated or newline-separated inputs.
 * It's a simplified version and might need adjustment for complex inputs.
 */
function parseInput(input: string): string {
    return input
        .split(',')
        .map(part => part.split('=')[1].trim())
        .join('\n');
}

export async function executeCode(
    source_code: string,
    language: CodingQuestion['language'],
    testCases: any[]
): Promise<ExecutionResult> {

    const language_id = LANGUAGE_ID_MAP[language];
    if (!language_id) {
        throw new Error(`Unsupported language: ${language}`);
    }

    const test_case_results: TestCaseResult[] = [];
    let passed_tests = 0;
    
    let totalTime = 0;
    let totalMemory = 0;
    let finalStatusId = 3; // Assume "Accepted" until a failure occurs

    for (const tc of testCases) {
        // Base64 encode for Judge0
        const submissionPayload = {
            source_code: Buffer.from(source_code).toString('base64'),
            language_id: language_id,
            stdin: Buffer.from(parseInput(tc.input)).toString('base64'),
            expected_output: Buffer.from(tc.expectedOutput).toString('base64'),
        };

        const response = await fetch(`https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // For public API, no key is needed. If you use a private/RapidAPI instance, add headers here.
                // 'X-RapidAPI-Key': 'YOUR_API_KEY',
                // 'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
            },
            body: JSON.stringify(submissionPayload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            return {
                stdout: null,
                stderr: `API Error: ${response.status} ${response.statusText}. ${errorBody}`,
                compile_output: null,
                message: "API Error",
                status: { id: 13, description: "API Error" },
                time: "0.0",
                memory: 0,
            };
        }

        const result = await response.json();
        
        totalTime += parseFloat(result.time || "0");
        totalMemory = Math.max(totalMemory, parseFloat(result.memory || "0"));

        if (result.status.id === 6) { // Compilation Error
            return {
                stdout: null,
                stderr: result.stderr ? Buffer.from(result.stderr, 'base64').toString('utf-8') : null,
                compile_output: result.compile_output ? Buffer.from(result.compile_output, 'base64').toString('utf-8') : "Compilation Failed",
                message: result.message ? Buffer.from(result.message, 'base64').toString('utf-8') : "Compilation Error",
                status: result.status,
                time: "0.0",
                memory: 0,
                passed_tests: 0,
                total_tests: testCases.length,
            };
        }
        
        const actualOutput = (result.stdout ? Buffer.from(result.stdout, 'base64').toString('utf-8') : "").trim();
        const expectedOutput = (tc.expectedOutput || "").trim();
        const passed = result.status.id === 3; // 3 is "Accepted"

        if (passed) {
            passed_tests++;
        }
        
        // Update final status if this is the first failure
        if (!passed && finalStatusId === 3) {
            finalStatusId = result.status.id;
        }

        test_case_results.push({
            input: tc.input,
            expected: expectedOutput,
            actual: actualOutput || (result.stderr ? Buffer.from(result.stderr, 'base64').toString('utf-8') : "No output"),
            passed: passed,
        });

        // If a test case fails with a runtime error, we can stop early
        if (result.status.id > 4) { // 4 is Wrong Answer, > 4 are various runtime errors
            break;
        }
    }
    
    const statusDescriptions: Record<number, string> = {
        1: 'In Queue',
        2: 'Processing',
        3: 'Accepted',
        4: 'Wrong Answer',
        5: 'Time Limit Exceeded',
        6: 'Compilation Error',
        7: 'Runtime Error (SIGSEGV)',
        8: 'Runtime Error (SIGXFSZ)',
        9: 'Runtime Error (SIGFPE)',
        10: 'Runtime Error (SIGABRT)',
        11: 'Runtime Error (NZEC)',
        12: 'Runtime Error (Other)',
        13: 'Internal Error',
        14: 'Exec Format Error',
    };
    
    const finalStatus = { id: finalStatusId, description: statusDescriptions[finalStatusId] || "Error" };

    return {
        stdout: finalStatusId === 3 ? "All test cases passed!" : null,
        stderr: finalStatusId !== 3 ? "One or more test cases failed." : null,
        compile_output: null,
        message: finalStatus.description,
        status: finalStatus,
        time: totalTime.toFixed(3),
        memory: totalMemory,
        passed_tests: passed_tests,
        total_tests: testCases.length,
        test_case_results: test_case_results,
    };
}
