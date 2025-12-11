"use client";

import Editor from "@monaco-editor/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CodingQuestion } from "@/types/schema";
import { executeCode, LANGUAGE_IDS } from "@/lib/code-execution";

interface CodingViewProps {
    question: CodingQuestion;
    onCodeChange: (code: string) => void;
    currentCode: string;
}

export default function CodingView({ question, onCodeChange, currentCode }: CodingViewProps) {
    const [output, setOutput] = useState("");
    const [executing, setExecuting] = useState(false);

    const handleRun = async () => {
        setExecuting(true);
        try {
            // Run against first test case or custom input
            const testCase = question.testCases[0];
            const result = await executeCode(
                currentCode,
                LANGUAGE_IDS[question.language] || 63,
                testCase.input
            );

            let out = result.stdout || result.stderr || result.compile_output || result.message;
            setOutput(out);

            // Simple verification
            if (result.stdout?.trim() === testCase.expectedOutput.trim()) {
                setOutput((prev) => prev + "\n\n✅ Test Case Passed!");
            } else {
                setOutput((prev) => prev + `\n\n❌ Expected: ${testCase.expectedOutput}\nGot: ${result.stdout}`);
            }

        } catch (err) {
            setOutput("Error executing code.");
        } finally {
            setExecuting(false);
        }
    };

    return (
        <div className="grid grid-cols-2 gap-4 h-[600px]">
            <div className="flex flex-col border rounded-md overflow-hidden">
                <div className="bg-gray-100 p-2 border-b font-mono text-sm">Editor ({question.language})</div>
                <Editor
                    height="100%"
                    defaultLanguage={question.language}
                    value={currentCode}
                    onChange={(val) => onCodeChange(val || "")}
                    theme="vs-dark"
                    options={{ minimap: { enabled: false }, fontSize: 14 }}
                />
            </div>
            <div className="flex flex-col space-y-4">
                <div className="flex-1 border rounded-md p-4 bg-gray-900 text-green-400 font-mono text-sm whitespace-pre-wrap overflow-auto">
                    {output || "Run code to see output..."}
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleRun} disabled={executing}>
                        {executing ? "Running..." : "Run Code"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
