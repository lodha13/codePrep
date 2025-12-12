
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

    // Basic validation: Check if the source code is not empty
    if (!source_code || source_code.trim().length < 10) {
        return {
            stdout: null,
            stderr: "Your code is too short or empty.",
            compile_output: null,
            message: "Execution failed.",
            status: { id: 6, description: "Compilation Error" },
            time: "0.1",
            memory: 0
        };
    }

    // A hardcoded, simplistic "solution" for the mock Two Sum problem.
    // This is just to have something to compare against for simulation purposes.
    const isCorrectSolution = source_code.includes("HashMap") && source_code.includes("complement");

    let passed_tests = 0;
    const test_case_results: TestCaseResult[] = [];

    for (const tc of testCases) {
        // In a real scenario, you'd execute the code with tc.input
        // and compare the result with tc.expectedOutput.
        // Here, we just simulate it.
        const passed = isCorrectSolution || (Math.random() > 0.5 && passed_tests < testCases.length -1) ; // Randomly pass some if not perfect
        
        if (passed) {
            passed_tests++;
        }
        
        test_case_results.push({
            input: tc.input,
            expected: tc.expectedOutput,
            actual: passed ? tc.expectedOutput : '[-1, -1]', // Simulate wrong output
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
