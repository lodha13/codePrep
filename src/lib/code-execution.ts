
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

const LANGUAGE_ID_MAP: Record<CodingQuestion['language'], number> = {
    java: 91,
    javascript: 93,
    python: 92,
    cpp: 54,
};

// Helper to decode base64 if the string exists
const decode = (str: string | undefined | null): string => {
    if (!str) return "";
    try {
        return Buffer.from(str, 'base64').toString('utf-8');
    } catch (e) {
        return "Error decoding output.";
    }
};

export async function executeCode(
    source_code: string,
    language: CodingQuestion['language'],
    testCases: TestCase[]
): Promise<ExecutionResult> {

    const language_id = LANGUAGE_ID_MAP[language];
    if (!language_id) {
        throw new Error(`Unsupported language: ${language}`);
    }

    try {
        // --- Step 1: Compilation Check ---
        const compileCheckPayload = {
            source_code: Buffer.from(source_code).toString('base64'),
            language_id: language_id,
        };

        const compileResponse = await fetch(`https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
                'X-RapidAPI-Key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY!,
            },
            body: JSON.stringify(compileCheckPayload),
        });
        
        if (!compileResponse.ok) {
             const errorBody = await compileResponse.json();
             return {
                stdout: null,
                stderr: `Judge0 API Error: ${errorBody.message || 'Failed to check compilation.'}`,
                compile_output: `Judge0 API Error: ${errorBody.message || 'Failed to check compilation.'}`,
                message: "API Error",
                status: { id: 13, description: "Internal Error" },
                time: "0",
                memory: 0,
            };
        }

        const compileResult = await compileResponse.json();

        // Status ID 6 is "Compilation Error"
        if (compileResult.status?.id === 6 || compileResult.compile_output) {
            return {
                stdout: null,
                stderr: null,
                compile_output: decode(compileResult.compile_output),
                message: "Compilation Error",
                status: compileResult.status,
                time: "0",
                memory: 0,
            };
        }

        // --- Step 2: Run Test Cases ---
        const submissionPayloads = testCases.map(tc => ({
            source_code: Buffer.from(source_code).toString('base64'),
            language_id: language_id,
            stdin: tc.input ? Buffer.from(tc.input).toString('base64') : undefined,
            expected_output: tc.expectedOutput ? Buffer.from(tc.expectedOutput.trim()).toString('base64') : undefined,
        }));

        const responses = await Promise.allSettled(
            submissionPayloads.map(payload =>
                fetch(`https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
                        'X-RapidAPI-Key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY!,
                    },
                    body: JSON.stringify(payload),
                }).then(res => {
                    if (!res.ok) {
                        return res.json().then(errorBody => Promise.reject(errorBody));
                    }
                    return res.json();
                })
            )
        );

        let passed_tests = 0;
        const test_case_results = responses.map((res, i) => {
             if (res.status === 'rejected' || !res.value) {
                return {
                    input: testCases[i].input,
                    expected: testCases[i].expectedOutput?.trim() || "",
                    actual: `Failed to execute test case ${i + 1}.`,
                    passed: false,
                };
            }
            
            const result = res.value;
            // Status 3 is "Accepted"
            const isPass = result?.status?.id === 3;
            if (isPass) {
                passed_tests++;
            }

            let actualOutput: string;
            if(result.status?.id === 3) { // Accepted
                 actualOutput = decode(result.stdout);
            } else if (result.status?.description) {
                 actualOutput = result.status.description;
                 if(result.stderr) {
                    actualOutput += `\n${decode(result.stderr)}`
                 }
            } else {
                actualOutput = "Unknown error";
            }
            
            return {
                input: testCases[i].input,
                expected: testCases[i].expectedOutput?.trim() || "",
                actual: actualOutput.trim(),
                passed: isPass,
            };
        });

        const totalTime = responses.reduce((acc, r) => acc + parseFloat(r.status === 'fulfilled' && r.value ? (r.value.time || "0") : "0"), 0);
        const maxMemory = responses.reduce((acc, r) => Math.max(acc, r.status === 'fulfilled' && r.value ? (r.value.memory || 0) : 0), 0);
        
        const finalStatus = passed_tests === testCases.length 
            ? { id: 3, description: "Accepted" }
            : { id: 4, description: "Wrong Answer" };


        return {
            stdout: null,
            stderr: null,
            compile_output: null,
            message: finalStatus.description,
            status: finalStatus,
            time: totalTime.toFixed(3),
            memory: maxMemory,
            passed_tests: passed_tests,
            total_tests: testCases.length,
            test_case_results: test_case_results,
        };

    } catch (error: any) {
        console.error("Fatal error in executeCode:", error);
        return {
            stdout: null,
            stderr: `An unexpected application error occurred: ${error.message}`,
            compile_output: null,
            message: "Internal Application Error",
            status: { id: 13, description: "Internal Error" },
            time: "0",
            memory: 0,
        };
    }
}
