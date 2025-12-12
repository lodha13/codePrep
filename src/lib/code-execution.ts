
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
        // Check if the returned variable is one of the parameters or a known "correct" variable.
        // This is a simplistic check for simulation purposes.
        if (returnedVar !== 'nums' && returnedVar !== 'target' && !source_code.includes(` ${returnedVar};`) && !source_code.includes(` ${returnedVar} `)) {
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

    // A hardcoded, simplistic "solution" for the mock Two Sum problem.
    const isCorrectSolution = source_code.includes("HashMap") && source_code.includes("complement");

    let passed_tests = 0;
    const test_case_results: TestCaseResult[] = [];

    for (const tc of testCases) {
        // In a real scenario, you'd execute the code with tc.input
        // and compare the result with tc.expectedOutput.
        // Here, we just simulate it based on whether the "correct" solution is present.
        const passed = isCorrectSolution;
        
        if (passed) {
            passed_tests++;
        }
        
        test_case_results.push({
            input: tc.input,
            expected: tc.expectedOutput,
            actual: passed ? tc.expectedOutput : '[-1, -1]', // Simulate wrong output if solution is not perfect
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
