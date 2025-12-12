
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
    
    // Detailed results for each test case run
    test_case_results?: TestCaseResult[];
    passed_tests?: number;
    total_tests?: number;
}

// This mock function simulates running code against a set of test cases.
// It's enhanced to recognize patterns for different problems.
export async function executeCode(source_code: string, testCases: any[]): Promise<ExecutionResult> {

    // Simulate a delay for a realistic feel
    await new Promise(resolve => setTimeout(resolve, 1000));

    // --- 1. Simulate Compilation Step ---

    // Basic syntax check for a very common error
    if (!source_code.includes(';')) {
        return {
            stdout: null,
            stderr: null,
            compile_output: "Compilation Error: Missing semicolon on line 3.",
            message: "Execution failed due to a compilation error.",
            status: { id: 6, description: "Compilation Error" },
            time: "0.1",
            memory: 0
        };
    }
    
    // Simulate an "undeclared variable" compilation error
    const returnMatch = source_code.match(/return\s+([a-zA-Z0-9_]+);/);
    if (returnMatch) {
        const returnedVar = returnMatch[1];
        if (returnedVar !== 'nums' && returnedVar !== 'target' && !source_code.includes(` ${returnedVar};`) && !source_code.includes(` ${returnedVar} `) && !source_code.includes(`(${returnedVar})`)) {
             return {
                stdout: null,
                stderr: null,
                compile_output: `Error: cannot find symbol\n  symbol:   variable ${returnedVar}\n  location: class Solution`,
                message: "Execution failed due to a compilation error.",
                status: { id: 6, description: "Compilation Error" },
                time: "0.1",
                memory: 0
            };
        }
    }


    // --- 2. Simulate Execution Step ---

    // Determine the problem type based on source code and test cases
    const isTwoSumProblem = source_code.includes("twoSum");
    const isReverseStringProblem = source_code.includes("reverse");

    let isCorrectSolution = false;
    if (isTwoSumProblem) {
        isCorrectSolution = source_code.includes("HashMap") && source_code.includes("complement");
    } else if (isReverseStringProblem) {
        isCorrectSolution = source_code.includes("new StringBuilder") && source_code.includes(".reverse()");
    }


    let passed_tests = 0;
    const test_case_results: TestCaseResult[] = [];

    for (const tc of testCases) {
        const passed = isCorrectSolution;
        let actualOutput = '';

        if (isTwoSumProblem) {
            actualOutput = passed ? tc.expectedOutput : '[-1, -1]';
        } else if (isReverseStringProblem) {
            // Simulate reversing the input string for a more realistic "actual" output
            const inputMatch = tc.input.match(/"(.*?)"/);
            const rawInput = inputMatch ? inputMatch[1] : '';
            actualOutput = passed ? tc.expectedOutput : `Incorrect output for ${rawInput}`;
        } else {
            actualOutput = 'Could not determine problem type.';
        }
        
        if (passed) {
            passed_tests++;
        }
        
        test_case_results.push({
            input: tc.input,
            expected: tc.expectedOutput,
            actual: actualOutput,
            passed: passed,
        });
    }

    const all_passed = passed_tests === testCases.length;

    if (all_passed) {
         return {
            stdout: "All test cases passed!",
            stderr: null,
            compile_output: null,
            message: "Accepted",
            status: { id: 3, description: "Accepted" },
            time: "0.2",
            memory: 15000,
            passed_tests: passed_tests,
            total_tests: testCases.length,
            test_case_results: test_case_results,
        };
    }

    // If we reach here, it means compilation was fine, but the logic was wrong.
    return {
        stdout: null,
        stderr: "One or more test cases failed.",
        compile_output: null,
        message: "Wrong Answer",
        status: { id: 4, description: "Wrong Answer" },
        time: "0.2",
        memory: 15000,
        passed_tests: passed_tests,
        total_tests: testCases.length,
        test_case_results: test_case_results,
    };
}
