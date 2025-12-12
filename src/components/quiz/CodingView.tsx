"use client";

import Editor from "@monaco-editor/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CodingQuestion } from "@/types/schema";
import { executeCode } from "@/lib/code-execution";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
            const result = await executeCode(currentCode, question.solutionCode);
            let out = result.stdout || result.stderr || result.compile_output || result.message;
            setOutput(out);
        } catch (err) {
            setOutput("Error executing code.");
        } finally {
            setExecuting(false);
        }
    };

    return (
        <div className="flex h-full">
            <div className="w-1/2 p-4">
                <ScrollArea className="h-full pr-4">
                    <h2 className="text-2xl font-bold mb-2">{question.title}</h2>
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: question.description }}/>

                    <div className="mt-6">
                        <h3 className="font-semibold mb-2">Visible Test Cases</h3>
                        {question.testCases.filter(tc => !tc.isHidden).map((tc, i) => (
                             <Card key={i} className="mb-2 bg-gray-50 font-mono text-sm">
                                <CardContent className="p-3">
                                   <p><span className="font-semibold">Input:</span> {tc.input}</p>
                                   <p><span className="font-semibold">Expected Output:</span> {tc.expectedOutput}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
            </div>
            <div className="w-1/2 flex flex-col border-l">
                 <div className="flex-grow flex flex-col">
                    <Editor
                        height="60%"
                        defaultLanguage={question.language}
                        value={currentCode}
                        onChange={(val) => onCodeChange(val || "")}
                        theme="vs-dark"
                        options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false }}
                    />
                    <div className="flex-grow flex flex-col border-t">
                         <Tabs defaultValue="output" className="flex-grow flex flex-col">
                            <TabsList className="px-2 border-b rounded-none justify-start">
                                <TabsTrigger value="output">Output</TabsTrigger>
                            </TabsList>
                            <TabsContent value="output" className="flex-grow p-2 bg-gray-900 text-white mt-0">
                               <ScrollArea className="h-full">
                                    <pre className="text-sm font-mono whitespace-pre-wrap">
                                        {executing ? "Executing..." : (output || "Run code to see output...")}
                                    </pre>
                               </ScrollArea>
                            </TabsContent>
                        </Tabs>
                        <div className="p-2 border-t bg-white flex justify-end">
                            <Button onClick={handleRun} disabled={executing}>
                                {executing ? "Running..." : "Run Code"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
