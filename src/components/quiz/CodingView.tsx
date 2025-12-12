
"use client";

import Editor from "@monaco-editor/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CodingQuestion } from "@/types/schema";
import { executeCode, ExecutionResult, TestCaseResult } from "@/lib/code-execution";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle } from "lucide-react";

interface CodingViewProps {
    question: CodingQuestion;
    onCodeChange: (code: string) => void;
    currentCode: string;
}

export default function CodingView({ question, onCodeChange, currentCode }: CodingViewProps) {
    const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
    const [executing, setExecuting] = useState(false);
    const [activeTab, setActiveTab] = useState("testcases");

    const handleRun = async () => {
        setExecuting(true);
        setExecutionResult(null); // Clear previous results
        setActiveTab("output");
        
        try {
            // Only run against VISIBLE test cases
            const visibleTestCases = question.testCases.filter(tc => !tc.isHidden);
            const result = await executeCode(currentCode, visibleTestCases);
            setExecutionResult(result);
        } catch (err) {
            setExecutionResult({
                 stderr: "Error executing code.",
                 status: { id: 11, description: "Execution Error" },
                 time: "0",
                 memory: 0,
                 compile_output: null,
                 message: null,
                 stdout: null,
            });
        } finally {
            setExecuting(false);
        }
    };
    
    const renderOutput = () => {
        if (executing) {
            return "Executing...";
        }
        if (!executionResult) {
            return "Run code to see output...";
        }
        if (executionResult.compile_output) {
            return <span className="text-red-500">{executionResult.compile_output}</span>;
        }
        if (executionResult.stderr) {
            return <span className="text-red-500">{executionResult.stderr}</span>;
        }
        if (!executionResult.test_case_results) {
            return "No test case results available.";
        }

        return (
            <div className="space-y-4">
                {executionResult.test_case_results.map((res, i) => (
                    <div key={i}>
                        <div className="flex items-center gap-2 mb-2">
                            {res.passed ? <CheckCircle className="h-5 w-5 text-green-500"/> : <XCircle className="h-5 w-5 text-red-500"/>}
                            <h4 className="font-semibold text-white">Test Case {i + 1}</h4>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${res.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {res.passed ? 'Passed' : 'Failed'}
                            </span>
                        </div>
                        <Card className="bg-gray-800 border-gray-700 text-gray-300 font-mono text-sm p-3">
                            <p><span className="font-semibold text-gray-400">Input:</span> {res.input}</p>
                            <p><span className="font-semibold text-gray-400">Expected:</span> {res.expected}</p>
                            <p><span className="font-semibold text-gray-400">Your Output:</span> {res.actual}</p>
                        </Card>
                    </div>
                ))}
            </div>
        )
    }

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
                             <TabsContent value="output" className="flex-grow p-4 bg-gray-900 text-white mt-0">
                               <ScrollArea className="h-full">
                                    <div className="text-sm font-mono whitespace-pre-wrap">
                                        {renderOutput()}
                                    </div>
                               </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    );
}
