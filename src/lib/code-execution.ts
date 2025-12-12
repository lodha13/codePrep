import { CodingQuestion, TestCase } from "@/types/schema";
import { Buffer } from "buffer";

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

const LANGUAGE_ID_MAP: Record<CodingQuestion["language"], number> = {
  java: 91,
  javascript: 93,
  python: 92,
  cpp: 54,
};

const decode = (str: string | undefined | null): string => {
  if (!str) return "";
  try {
    return Buffer.from(str, "base64").toString("utf-8");
  } catch {
    return "Error decoding output.";
  }
};

export async function executeCode(
  source_code: string,
  language: CodingQuestion["language"],
  testCases: TestCase[]
): Promise<ExecutionResult> {
  const language_id = LANGUAGE_ID_MAP[language];
  if (!language_id) throw new Error(`Unsupported language: ${language}`);

  const judge0Endpoint = 'https://ce.judge0.com/submissions?base64_encoded=true&wait=true';
  const encodedSource = Buffer.from(source_code).toString("base64");
  
  try {
    // -----------------------------------------------------
    // 1️⃣ COMPILATION CHECK
    // -----------------------------------------------------
    const compilePayload = {
      language_id,
      source_code: encodedSource,
    };

    const compileRes = await fetch(judge0Endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(compilePayload),
    });

    const compileResult = await compileRes.json();
    
    // Status 6 = Compilation Error
    if (compileResult.status?.id === 6) {
      return {
        stdout: null,
        stderr: decode(compileResult.stderr),
        compile_output: decode(compileResult.compile_output),
        message: "Compilation Error",
        status: compileResult.status,
        time: "0",
        memory: 0,
      };
    }
    
    // Other non-accepted status during initial check (e.g., runtime error without input)
    if (compileResult.status?.id > 3) {
       return {
        stdout: decode(compileResult.stdout),
        stderr: decode(compileResult.stderr),
        compile_output: decode(compileResult.compile_output),
        message: compileResult.status?.description || "Error",
        status: compileResult.status,
        time: compileResult.time || "0",
        memory: compileResult.memory || 0,
      };
    }

    // -----------------------------------------------------
    // 2️⃣ RUN TEST CASES
    // -----------------------------------------------------
    const submissions = testCases.map((tc) => ({
      language_id,
      source_code: encodedSource,
      stdin: tc.input
        ? Buffer.from(tc.input).toString("base64")
        : undefined,
      expected_output: tc.expectedOutput
        ? Buffer.from(tc.expectedOutput).toString("base64")
        : undefined,
    }));
    
    const results = await Promise.allSettled(
      submissions.map((payload) =>
        fetch(judge0Endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).then((r) => r.json())
      )
    );

    // -----------------------------------------------------
    // 3️⃣ FORMAT FINAL RESULTS
    // -----------------------------------------------------
    let passed_tests = 0;

    const test_case_results: TestCaseResult[] = results.map(
      (res: any, index: number) => {
        const tc = testCases[index];
        const defaultExpected = tc.expectedOutput || "";
        
        if (res.status !== "fulfilled" || !res.value) {
          return {
            input: tc.input,
            expected: defaultExpected,
            actual: "Execution failed due to a network or API error.",
            passed: false,
          };
        }

        const data = res.value;
        const isPass = data.status?.id === 3;

        if (isPass) passed_tests++;
        
        const actual_output = isPass
            ? decode(data.stdout)
            : `${data.status?.description || "Error"}\n${decode(data.stderr) || ''}\n${decode(data.compile_output) || ''}`;

        return {
          input: tc.input,
          expected: defaultExpected,
          actual: actual_output.trim(),
          passed: isPass,
        };
      }
    );

    const totalTime = results.reduce((acc, r) => {
        if (r.status === 'fulfilled' && r.value?.time) {
            return acc + parseFloat(r.value.time);
        }
        return acc;
    }, 0);

    const maxMemory = results.reduce((acc, r) => {
        if (r.status === 'fulfilled' && r.value?.memory) {
            return Math.max(acc, r.value.memory);
        }
        return acc;
    }, 0);
    
    const finalStatus =
      passed_tests === testCases.length && testCases.length > 0
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
      passed_tests,
      total_tests: testCases.length,
      test_case_results,
    };
  } catch (error: any) {
    return {
      stdout: null,
      stderr: error.message,
      compile_output: null,
      message: "Internal Application Error",
      status: { id: 13, description: "Internal Error" }, // Judge0 internal error id
      time: "0",
      memory: 0,
    };
  }
}