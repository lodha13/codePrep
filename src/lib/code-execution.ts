
import { CodingQuestion } from "@/types/schema";

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
// See https://judge0.com/api/languages
const LANGUAGE_ID_MAP: Record<CodingQuestion['language'], number> = {
    java: 91, // Java 17
    javascript: 93, // Node.js 18.15.0
    python: 92, // Python 3.11.2
    cpp: 54, // C++ (GCC 9.2.0)
};

/**
 * Extracts the input values from the test case string.
 * Example: "nums = [2,7,11,15], target = 9" -> "2,7,11,15\n9"
 * This is a simplified parser and might need to be made more robust.
 */
function parseInput(input: string): string {
    return input.split(',')
        .map(part => part.split('=')[1].trim())
        .join('\n');
}

export async function executeCode(
    source_code: string,
    language: CodingQuestion['language'],
    testCases: any[]
): Promise<ExecutionResult> {

    const apiKey = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
    const apiHost = process.env.NEXT_PUBLIC_RAPIDAPI_HOST;

    if (!apiKey || !apiHost) {
        throw new Error("Judge0 API key or host is not configured in environment variables.");
    }
    
    const language_id = LANGUAGE_ID_MAP[language];
    if (!language_id) {
        throw new Error(`Unsupported language: ${language}`);
    }
    
    const test_case_results: TestCaseResult[] = [];
    let passed_tests = 0;
    
    let totalTime = 0;
    let totalMemory = 0;

    for (const tc of testCases) {
        // Judge0 expects base64 encoded strings for certain fields, but we will use the wait=true parameter
        // which works with plain text.
        const submissionPayload = {
            source_code: source_code,
            language_id: language_id,
            stdin: parseInput(tc.input),
            expected_output: tc.expectedOutput,
        };

        const response = await fetch(`https://${apiHost}/submissions?base64_encoded=false&wait=true`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': apiHost,
            },
            body: JSON.stringify(submissionPayload),
        });

        if (!response.ok) {
            // Handle HTTP errors from the API itself
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
        
        // Accumulate time and memory
        totalTime += parseFloat(result.time || "0");
        totalMemory = Math.max(totalMemory, parseFloat(result.memory || "0"));

        // If there's a compilation error, stop immediately and report it.
        if (result.status.id === 6) { // 6 is Compilation Error
            return {
                stdout: null,
                stderr: result.stderr ? atob(result.stderr) : null,
                compile_output: result.compile_output ? atob(result.compile_output) : "Compilation Failed",
                message: result.message ? atob(result.message) : "Compilation Error",
                status: result.status,
                time: "0.0",
                memory: 0,
                passed_tests: 0,
                total_tests: testCases.length,
            };
        }
        
        const actualOutput = (result.stdout ? atob(result.stdout) : "").trim();
        const expectedOutput = (tc.expectedOutput || "").trim();
        const passed = result.status.id === 3; // 3 is "Accepted" which means it matched expected output

        if (passed) {
            passed_tests++;
        }

        test_case_results.push({
            input: tc.input,
            expected: expectedOutput,
            actual: actualOutput || (result.stderr ? atob(result.stderr) : "No output"),
            passed: passed,
        });

        // If a test case fails with a runtime error, we can stop early
        if (result.status.id > 4) { // 4 is Wrong Answer, > 4 are various runtime errors
            break;
        }
    }
    
    const allPassed = passed_tests === testCases.length;
    const finalStatus = allPassed ? { id: 3, description: "Accepted" } : { id: 4, description: "Wrong Answer" };

    return {
        stdout: allPassed ? "All test cases passed!" : null,
        stderr: allPassed ? null : "One or more test cases failed.",
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
