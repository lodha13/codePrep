// This file simulates a code execution environment without relying on external APIs.
// It provides a generic way to give feedback on code correctness for this prototype.

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


// --- Simulation Logic ---

/**
 * Checks for basic, common compilation errors.
 * @param source_code The user's source code.
 * @returns A string with the compile error, or null if none are found.
 */
function simulateCompilation(source_code: string): string | null {
    // 1. Check for a return statement with an obviously undeclared variable.
    // This is a simple but effective way to catch common mistakes.
    const returnMatch = source_code.match(/return\s+([a-zA-Z_][a-zA-Z0-9_]*);/);
    if (returnMatch) {
        const variableName = returnMatch[1];
        // Check if this variable was declared anywhere in the code.
        const declarationRegex = new RegExp(`(int|String|var|let|const|StringBuilder)\\s+${variableName}`);
        if (!declarationRegex.test(source_code) && variableName !== "null") {
             return `Error: cannot find symbol\n  symbol:   variable ${variableName}`;
        }
    }
    
    // 2. Check for missing semicolon after a return statement (common in Java/C++)
    if (source_code.includes('return') && !source_code.includes(';')) {
        return "Error: ';' expected";
    }

    return null; // No compilation errors found
}


export async function executeCode(
    source_code: string,
    language: string,
    testCases: any[]
): Promise<ExecutionResult> {

    // 1. First, simulate the compilation step.
    const compileError = simulateCompilation(source_code);
    if (compileError) {
        return {
            stdout: null,
            stderr: null,
            compile_output: compileError,
            message: "Compilation Error",
            status: { id: 6, description: "Compilation Error" },
            time: "0.0",
            memory: 0,
            passed_tests: 0,
            total_tests: testCases.length,
        };
    }

    // 2. If compilation is "successful", proceed to run test cases.
    const test_case_results: TestCaseResult[] = [];
    let passed_tests = 0;
    
    // For this simulation, we'll assume the logic is correct if it compiles.
    // A real implementation would execute the code against each input.
    const all_passed = true; 

    for (const tc of testCases) {
        const passed = all_passed; // In our simulation, if it compiles, it passes.
        if (passed) {
            passed_tests++;
        }
        test_case_results.push({
            input: tc.input,
            expected: tc.expectedOutput,
            actual: passed ? tc.expectedOutput : "Simulated incorrect output", // Simulate correct output
            passed,
        });
    }

    // 3. Return the final result.
    if (all_passed) {
         return {
            stdout: "All test cases passed!",
            stderr: null,
            compile_output: null,
            message: "Accepted",
            status: { id: 3, description: "Accepted" },
            time: "0.12", // Simulated realistic time
            memory: 15240, // Simulated realistic memory
            passed_tests: passed_tests,
            total_tests: testCases.length,
            test_case_results: test_case_results,
        };
    }

    // This part of the code is now less likely to be reached in the simulation,
    // unless the logic above is changed to simulate logical failures.
    return {
        stdout: null,
        stderr: "One or more test cases failed.",
        compile_output: null,
        message: "Wrong Answer",
        status: { id: 4, description: "Wrong Answer" },
        time: "0.15",
        memory: 15300,
        passed_tests: passed_tests,
        total_tests: testCases.length,
        test_case_results: test_case_results,
    };
}
