
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

function parseInput(input: string): string {
    if (!input) return '';
    return input
        .split(',')
        .map(part => part.split('=')[1]?.trim() || '')
        .join('\n')
        .replace(/\[/g, '')
        .replace(/\]/g, '');
}

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
        const submissionPayloads = testCases.map(tc => ({
            source_code: Buffer.from(source_code).toString('base64'),
            language_id: language_id,
            stdin: Buffer.from(parseInput(tc.input)).toString('base64'),
            expected_output: tc.expectedOutput ? Buffer.from(tc.expectedOutput).toString('base64') : undefined,
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

        const results = responses.map((res, index) => {
            if (res.status === 'fulfilled') {
                return res.value;
            } else {
                console.error(`Error processing test case ${index}:`, res.reason);
                return {
                    status: { id: 13, description: "Internal Error" },
                    stderr: Buffer.from(`Failed to execute test case ${index + 1}.`).toString('base64'),
                    time: "0",
                    memory: 0,
                };
            }
        });

        const firstResult = results[0];
        if (firstResult?.status?.id === 6) { // 6 is Compilation Error
            return {
                stdout: null,
                stderr: null,
                compile_output: firstResult.compile_output ? Buffer.from(firstResult.compile_output, 'base64').toString('utf-8') : "Compilation Failed",
                message: "Compilation Error",
                status: firstResult.status,
                time: "0",
                memory: 0,
            };
        }

        let passed_tests = 0;
        const test_case_results = results.map((result, i) => {
            const isPass = result?.status?.id === 3;
            if (isPass) {
                passed_tests++;
            }

            let actualOutput = "No output";
            if (result?.stdout) {
                actualOutput = Buffer.from(result.stdout, 'base64').toString('utf-8');
            } else if (result?.stderr) {
                actualOutput = Buffer.from(result.stderr, 'base64').toString('utf-8');
            }
            
            return {
                input: testCases[i].input,
                expected: testCases[i].expectedOutput?.trim() || "",
                actual: actualOutput.trim(),
                passed: isPass,
            };
        });

        const totalTime = results.reduce((acc, r) => acc + parseFloat(r?.time || "0"), 0);
        const maxMemory = results.reduce((acc, r) => Math.max(acc, r?.memory || 0), 0);

        const finalStatus = results.reduce((currentStatus, r) => {
            if (!r || !r.status) return { id: 13, description: "Internal Error" };
            return r.status.id > currentStatus.id ? r.status : currentStatus;
        }, { id: 3, description: "Accepted" });
        
        if (passed_tests < testCases.length && finalStatus.id === 3) {
            finalStatus.id = 4;
            finalStatus.description = "Wrong Answer";
        }

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
