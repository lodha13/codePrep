
export interface ExecutionResult {
    stdout: string;
    stderr: string;
    compile_output: string;
    message: string;
    status: { id: number; description: string };
    time: string;
    memory: number;
    passed_tests?: number; // Number of tests passed
    total_tests?: number;  // Total tests run
}

// This is a mock function. In a real application, you would have a secure
// backend service to execute code against all test cases.
export async function executeCode(source_code: string, solution_code?: string, testCases: any[] = []): Promise<ExecutionResult> {

    // Simulate a delay for a realistic feel
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Basic validation: Check if the source code is not empty
    if (!source_code || source_code.trim().length < 10) {
        return {
            stdout: "",
            stderr: "Your code is too short or empty.",
            compile_output: "",
            message: "Execution failed.",
            status: { id: 6, description: "Compilation Error" },
            time: "0.1",
            memory: 0
        };
    }

    const total_tests = testCases.length;

    // If a solution code is provided, we can do a simple comparison for simulation
    if (solution_code && source_code.replace(/\s/g, '') === solution_code.replace(/\s/g, '')) {
         return {
            stdout: `All ${total_tests} test cases passed!`,
            stderr: "",
            compile_output: "",
            message: "Execution successful.",
            status: { id: 3, description: "Accepted" },
            time: "0.2",
            memory: 15000,
            passed_tests: total_tests,
            total_tests: total_tests,
        };
    }

    // Simulate partial success for other cases. Let's say it passes 1 of the visible tests.
    const passed_tests = Math.min(1, testCases.filter(tc => !tc.isHidden).length); 
    const first_failed_case = testCases.find(tc => !tc.isHidden) || testCases[0];

    return {
        stdout: `Input: ${first_failed_case?.input ?? 'N/A'}\nExpected: ${first_failed_case?.expectedOutput ?? 'N/A'}\nGot: []`,
        stderr: "",
        compile_output: "",
        message: "Wrong Answer",
        status: { id: 4, description: "Wrong Answer" },
        time: "0.2",
        memory: 15000,
        passed_tests: passed_tests,
        total_tests: total_tests,
    };
}
