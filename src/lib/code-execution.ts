
// This file is now configured to use a real code execution API (Judge0).
// Get your free API key from https://rapidapi.com/judge0-official/api/judge0-ce

const JUDGE0_API_URL = "https://judge0-ce.p.rapidapi.com";

interface Judge0Submission {
    stdout: string | null;
    stderr: string | null;
    compile_output: string | null;
    message: string | null;
    status: { id: number; description: string };
    time: string;
    memory: number;
}

export interface TestCaseResult {
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
}

export interface ExecutionResult extends Judge0Submission {
    test_case_results?: TestCaseResult[];
    passed_tests?: number;
    total_tests?: number;
}

// Maps our app's language names to Judge0 language IDs
const languageIdMap: Record<string, number> = {
    java: 62,
    javascript: 63,
    python: 71,
    cpp: 54,
};


// Function to create a submission to the Judge0 API
async function createSubmission(language_id: number, source_code: string, stdin: string, expected_output: string): Promise<Judge0Submission> {
    const response = await fetch(`${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": process.env.NEXT_PUBLIC_RAPIDAPI_KEY!,
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        },
        body: JSON.stringify({
            language_id,
            source_code,
            stdin,
            expected_output,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Judge0 API Error:", errorText);
        throw new Error(`Judge0 API request failed with status ${response.status}`);
    }

    return response.json();
}


export async function executeCode(
    source_code: string,
    language: string, // e.g., 'java'
    testCases: any[]
): Promise<ExecutionResult> {

    const languageId = languageIdMap[language];
    if (!languageId) {
        throw new Error(`Unsupported language: ${language}`);
    }
    if (!process.env.NEXT_PUBLIC_RAPIDAPI_KEY) {
        console.error("RapidAPI key is not set. Please add NEXT_PUBLIC_RAPIDAPI_KEY to your .env file.");
        // Return a mock error response
        return {
            stdout: null,
            stderr: "API Key not configured. Please contact the administrator.",
            compile_output: "Configuration Error",
            message: "API key missing.",
            status: { id: -1, description: "Configuration Error" },
            time: "0",
            memory: 0,
        }
    }


    const test_case_results: TestCaseResult[] = [];
    let passed_tests = 0;

    // Check for compilation error first by sending one request without input
    const compileCheckSubmission = await createSubmission(languageId, source_code, "", "");
    if (compileCheckSubmission.status.id > 3) { // Status > 3 indicates an error (Compilation, Runtime, etc.)
        return { ...compileCheckSubmission, passed_tests: 0, total_tests: testCases.length };
    }

    for (const tc of testCases) {
        // Judge0 uses stdin for input
        const submissionResult = await createSubmission(languageId, source_code, tc.input, tc.expectedOutput);
        
        // Judge0 status id 3 is "Accepted"
        const passed = submissionResult.status.id === 3;
        if (passed) {
            passed_tests++;
        }

        test_case_results.push({
            input: tc.input,
            expected: tc.expectedOutput,
            actual: submissionResult.stdout || submissionResult.stderr || submissionResult.compile_output || "Execution failed",
            passed,
        });
    }

    const overallStatus = passed_tests === testCases.length 
        ? { id: 3, description: "Accepted" } 
        : { id: 4, description: "Wrong Answer" };

    // We can average the time and memory, or take the max. Let's take the first for simplicity.
    const firstResult = await createSubmission(languageId, source_code, testCases[0]?.input || "", testCases[0]?.expectedOutput || "");


    return {
        stdout: firstResult.stdout,
        stderr: passed_tests === testCases.length ? null : "One or more test cases failed.",
        compile_output: firstResult.compile_output,
        message: overallStatus.description,
        status: overallStatus,
        time: firstResult.time,
        memory: firstResult.memory,
        passed_tests,
        total_tests: testCases.length,
        test_case_results,
    };
}
