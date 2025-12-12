"use client";

import Editor from "@monaco-editor/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CodingQuestion } from "@/types/schema";
import { executeCode } from "@/lib/code-execution";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

interface CodingViewProps {
    question: CodingQuestion;
    onCodeChange: (code: string) => void;
    currentCode: string;
}

export default function CodingView({ question, onCodeChange, currentCode }: CodingViewProps) {
    const [output, setOutput] = useState("");
    const [executing, setExecuting] = useState(false);
    const [activeTab, setActiveTab] = useState("output");

    const handleRun = async () => {
        setExecuting(true);
        setActiveTab("output");
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
        <div className="flex h-full flex-col lg:flex-row">
            <div className="lg:w-1/2 p-4 flex flex-col">
                <ScrollArea className="flex-1">
                    <div className="prose prose-sm max-w-none mb-4">
                        <h2 className="text-xl font-bold">{question.title}</h2>
                        <div dangerouslySetInnerHTML={{ __html: question.description }} />
                    </div>
                </ScrollArea>
            </div>
            <Separator orientation="vertical" className="hidden lg:block h-auto" />
            <div className="lg:w-1/2 flex flex-col h-full">
                 <div className="flex-grow flex flex-col">
                    <Editor
                        height="60%"
                        defaultLanguage={question.language}
                        value={currentCode}
                        onChange={(val) => onCodeChange(val || "")}
                        theme="vs-dark"
                        options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, automaticLayout: true }}
                    />
                    <div className="flex-grow flex flex-col border-t">
                         <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col">
                            <div className="flex items-center justify-between px-2 border-b">
                                <TabsList className="rounded-none justify-start bg-transparent border-0 p-0">
                                    <TabsTrigger value="testcases" className="text-xs data-[state=active]:border-b-2 border-black rounded-none">Testcases</TabsTrigger>
                                    <TabsTrigger value="output" className="text-xs data-[state=active]:border-b-2 border-black rounded-none">Output</TabsTrigger>
                                </TabsList>
                                <Button onClick={handleRun} disabled={executing} size="sm" className="my-1 mr-2">
                                    {executing ? "Running..." : "Run Code"}
                                </Button>
                            </div>
                            <TabsContent value="testcases" className="flex-grow p-2 mt-0">
                               <ScrollArea className="h-full">
                                    {question.testCases.filter(tc => !tc.isHidden).map((tc, i) => (
                                        <Card key={i} className="mb-2 bg-gray-50 font-mono text-sm">
                                            <CardContent className="p-3">
                                            <p><span className="font-semibold">Input:</span> {tc.input}</p>
                                            <p><span className="font-semibold">Expected Output:</span> {tc.expectedOutput}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                               </ScrollArea>
                            </TabsContent>
                             <TabsContent value="output" className="flex-grow p-2 bg-gray-900 text-white mt-0">
                               <ScrollArea className="h-full">
                                    <pre className="text-sm font-mono whitespace-pre-wrap">
                                        {executing ? "Executing..." : (output || "Run code to see output...")}
                                    </pre>
                               </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    );
}
