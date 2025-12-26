
import { CodingQuestion, TestCase } from "@/types/schema";
import { Buffer } from "buffer";
import { getLanguageId } from "./language-utils";

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

const judge0Endpoint = 'https://ce.judge0.com/submissions?base64_encoded=true&wait=true';

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
  language: string,
  testCases: TestCase[]
): Promise<ExecutionResult> {
  const language_id = await getLanguageId(language);
  if (!language_id) throw new Error(`Unsupported or invalid language: ${language}`);

  const encodedSource = Buffer.from(source_code).toString("base64");

  try {
    // -----------------------------------------------------
    // 1️⃣ COMPILATION CHECK
    // -----------------------------------------------------
    const compilePayload: any = {
      language_id,
      source_code: encodedSource,
    };

    const compileRes = await fetch(judge0Endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(compilePayload),
    });

    if (!compileRes.ok) {
      const errorText = await compileRes.text();
      return {
        stdout: null,
        stderr: `Judge0 API Error: ${errorText}`,
        compile_output: `Judge0 API Error: ${errorText}`,
        message: "Judge0 API Error",
        status: { id: 13, description: "Internal Error" },
        time: "0",
        memory: 0,
      };
    }

    const compileResult = await compileRes.json();

    if (compileResult.status?.id === 6) { // 6 = Compilation Error
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


    // -----------------------------------------------------
    // 2️⃣ RUN TEST CASES
    // -----------------------------------------------------
    const submissions = testCases.map((tc) => {
        const input = tc.input ?? ""; // Ensure input is at least an empty string
        const expectedOutput = tc.expectedOutput ?? "";
        return {
            language_id,
            source_code: encodedSource,
            stdin: Buffer.from(input).toString("base64"),
            expected_output: Buffer.from(expectedOutput).toString("base64"),
        };
    });
    
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
        const input = tc.input ?? "";
        const expected = tc.expectedOutput ?? "";

        if (res.status !== "fulfilled" || !res.value) {
          return {
            input,
            expected,
            actual: `Failed to execute test case ${index + 1}.`,
            passed: false,
          };
        }

        const data = res.value;
        const isPass = data.status?.id === 3; // 3 = Accepted

        if (isPass) passed_tests++;

        const decodedStdout = decode(data.stdout);
        const actual_output = (data.status?.id === 3 || data.status?.id === 4)
             ? decodedStdout
             : `${data.status?.description || 'Error'}\n${decode(data.stderr) || ''}\n${decode(data.compile_output) || ''}`.trim();

        return {
          input,
          expected,
          actual: actual_output.trim(),
          passed: isPass,
        };
      }
    );

    const totalTime = results.reduce((acc: number, r: any) => {
      if (r.status === 'fulfilled' && r.value?.time) {
        return acc + parseFloat(r.value.time);
      }
      return acc;
    }, 0);

    const maxMemory = results.reduce((acc: number, r: any) => {
      if (r.status === 'fulfilled' && r.value?.memory) {
        return Math.max(acc, r.value.memory);
      }
      return acc;
    }, 0);

    const finalStatus =
      passed_tests === testCases.length
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
      status: { id: 13, description: "Internal Error" },
      time: "0",
      memory: 0,
    };
  }
}
