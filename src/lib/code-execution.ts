export interface ExecutionResult {
    stdout: string;
    stderr: string;
    compile_output: string;
    message: string;
    status: { id: number; description: string };
    time: string;
    memory: number;
}

// This is a mock function. In a real application, you would have a secure
// backend service to execute code against all test cases.
// For this prototype, we will simulate success if the code is reasonably long
// or matches a stored solution.
export async function executeCode(source_code: string, solution_code?: string): Promise<ExecutionResult> {

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

    // If a solution code is provided, we can do a simple comparison
    // In a real scenario, you'd run against test cases.
    if (solution_code && source_code.replace(/\s/g, '') === solution_code.replace(/\s/g, '')) {
         return {
            stdout: "All test cases passed!",
            stderr: "",
            compile_output: "",
            message: "Execution successful.",
            status: { id: 3, description: "Accepted" },
            time: "0.2",
            memory: 15000
        };
    }

    // Simulate a generic "wrong answer" for other cases
    return {
        stdout: "Input: [2, 7, 11, 15], target = 9\nExpected: [0, 1]\nGot: []",
        stderr: "",
        compile_output: "",
        message: "Wrong Answer",
        status: { id: 4, description: "Wrong Answer" },
        time: "0.2",
        memory: 15000
    };
}
