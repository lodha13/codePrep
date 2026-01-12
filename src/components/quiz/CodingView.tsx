
"use client";

import Editor from "@monaco-editor/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CodingQuestion } from "@/types/schema";
import { executeCode, ExecutionResult } from "@/lib/code-execution";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, PanelLeft, PanelLeftOpen, PanelBottom, PanelBottomOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodingViewProps {
    question: CodingQuestion;
    onCodeChange: (code: string) => void;
    currentCode: string;
}

export default function CodingView({ question, onCodeChange, currentCode }: CodingViewProps) {
    const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
    const [executing, setExecuting] = useState(false);
    const [activeTab, setActiveTab] = useState("testcases");

    // Layout State
    const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
    const [bottomPanelCollapsed, setBottomPanelCollapsed] = useState(true);

    const toggleBottomPanel = () => {
        setBottomPanelCollapsed(prev => !prev);
    }

    const handleRun = async () => {
        setExecuting(true);
        setExecutionResult(null);
        setActiveTab("output");
        
        // Open the console if it's closed
        if (bottomPanelCollapsed) {
            toggleBottomPanel();
        }

        try {
            const visibleTestCases = question.testCases.filter(tc => !tc.isHidden);
            const result = await executeCode(currentCode, question.language, visibleTestCases);
            setExecutionResult(result);
        } catch (err) {
            throw err;
        } finally {
            setExecuting(false);
        }
    };
    
    const renderOutput = () => {
        if (executing) return "Executing...";
        if (!executionResult) return "Run code to see output...";
        if (executionResult.compile_output) return <span className="text-destructive">{executionResult.compile_output}</span>;
        if (executionResult.stderr && !executionResult.test_case_results) return <span className="text-destructive">{executionResult.stderr}</span>;
        if (!executionResult.test_case_results) return "No test case results available.";

        return (
            <div className="space-y-4">
                {executionResult.test_case_results.map((res, i) => (
                    <div key={i}>
                        <div className="flex items-center gap-2 mb-2">
                            {res.passed ? <CheckCircle className="h-5 w-5 text-green-500"/> : <XCircle className="h-5 w-5 text-red-500"/>}
                            <h4 className="font-semibold">Test Case {i + 1}</h4>
                            <span className={cn(
                                "text-xs font-bold px-2 py-0.5 rounded-full",
                                res.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            )}>
                                {res.passed ? 'Passed' : 'Failed'}
                            </span>
                        </div>
                        <Card className="bg-muted border-border font-mono text-sm">
                            <div className="p-3 overflow-x-auto">
                                <p className="whitespace-nowrap"><span className="font-semibold text-muted-foreground">Input:</span> {res.input}</p>
                                <p className="whitespace-nowrap"><span className="font-semibold text-muted-foreground">Expected:</span> {res.expected}</p>
                                <p className="whitespace-nowrap"><span className="font-semibold text-muted-foreground">Your Output:</span> {res.actual}</p>
                            </div>
                        </Card>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-background text-foreground">
            {/* Mobile: Tabbed Layout */}
            <div className="lg:hidden h-full flex flex-col">
                <Tabs defaultValue="question" className="flex-grow flex flex-col overflow-hidden">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="question">Question</TabsTrigger>
                        <TabsTrigger value="code">Code</TabsTrigger>
                        <TabsTrigger value="output">Output</TabsTrigger>
                    </TabsList>
                    <TabsContent value="question" className="flex-grow overflow-y-auto p-4">
                        <div className="prose prose-sm max-w-none">
                            <h2 className="text-xl font-bold">{question.title}</h2>
                            <div dangerouslySetInnerHTML={{ __html: question.description }} />
                        </div>
                    </TabsContent>
                    <TabsContent value="code" className="flex-grow flex flex-col">
                        <div className="flex-1 overflow-hidden">
                            <Editor
                                height="100%"
                                defaultLanguage={question.language}
                                value={currentCode}
                                onChange={(val) => onCodeChange(val || "")}
                                theme="vs-dark"
                                options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
                            />
                        </div>
                         <div className="p-2 border-t">
                            <Button onClick={handleRun} disabled={executing} size="sm" className="w-full">
                                {executing ? "Running..." : "Run Code"}
                            </Button>
                        </div>
                    </TabsContent>
                    <TabsContent value="output" className="flex-grow overflow-y-auto p-4 bg-background text-foreground font-mono text-sm">
                        {renderOutput()}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Desktop: Horizontal Layout */}
            <div className="hidden lg:flex flex-grow overflow-hidden">
                {/* Left Panel: Question */}
                <div className={cn("flex flex-col border-r", leftPanelCollapsed ? "hidden" : "w-1/3")}>
                    <div className="p-2 border-b flex items-center justify-between">
                        <h3 className="font-semibold text-lg ml-2">Question</h3>
                        <Button variant="ghost" size="icon" onClick={() => setLeftPanelCollapsed(true)}>
                            <PanelLeft className="h-5 w-5"/>
                        </Button>
                    </div>
                    <ScrollArea className="flex-1 p-4">
                        <div className="prose prose-sm max-w-none">
                            <h2 className="text-xl font-bold">{question.title}</h2>
                            <div dangerouslySetInnerHTML={{ __html: question.description }} />
                        </div>
                    </ScrollArea>
                </div>
                
                {/* Center: Editor (75%) */}
                <div className="flex-1 flex flex-col overflow-hidden">
                     <div className="p-2 border-b flex items-center justify-between gap-2 bg-background">
                         <div className="flex items-center gap-2">
                            {leftPanelCollapsed && (
                                 <Button variant="ghost" size="icon" onClick={() => setLeftPanelCollapsed(false)}>
                                    <PanelLeftOpen className="h-5 w-5"/>
                                </Button>
                            )}
                            <h3 className="font-semibold">Code Editor</h3>
                        </div>
                        <div className="flex items-center gap-2">
                             <Button onClick={handleRun} disabled={executing} size="sm">
                                {executing ? "Running..." : "Run Code"}
                             </Button>
                            <Button variant="outline" size="sm" onClick={toggleBottomPanel}>
                                {bottomPanelCollapsed ? <PanelBottom className="h-4 w-4 mr-2" /> : <PanelBottomOpen className="h-4 w-4 mr-2" />}
                                Console
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                         <Editor
                            defaultLanguage={question.language}
                            value={currentCode}
                            onChange={(val) => onCodeChange(val || "")}
                            theme="vs-dark"
                            options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, automaticLayout: true }}
                        />
                    </div>
                </div>
                
                {/* Right Panel: Output (25%) */}
                {!bottomPanelCollapsed && (
                    <div className="w-1/4 flex flex-col border-l">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col bg-background text-foreground">
                            <TabsList className="rounded-none justify-start px-2 border-b bg-secondary">
                                <TabsTrigger value="testcases" className="text-xs rounded-none data-[state=active]:bg-background">Test Cases</TabsTrigger>
                                <TabsTrigger value="output" className="text-xs rounded-none data-[state=active]:bg-background">Output</TabsTrigger>
                            </TabsList>
                            <TabsContent value="testcases" className="flex-grow mt-0 overflow-hidden">
                               <div className="h-full overflow-y-auto p-4">
                                    {question.testCases.filter(tc => !tc.isHidden).map((tc, i) => (
                                        <Card key={i} className="mb-2 bg-muted p-3 font-mono text-sm">
                                            <CardContent className="p-0 overflow-x-auto">
                                                <p className="whitespace-nowrap"><span className="font-semibold text-muted-foreground">Input:</span> {tc.input}</p>
                                                <p className="whitespace-nowrap"><span className="font-semibold text-muted-foreground">Expected Output:</span> {tc.expectedOutput}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                               </div>
                            </TabsContent>
                            <TabsContent value="output" className="flex-grow mt-0 overflow-hidden">
                               <div className="h-full overflow-y-auto p-4">
                                    <div className="text-sm font-mono whitespace-pre-wrap">
                                        {renderOutput()}
                                    </div>
                               </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
            </div>
        </div>
    );
}
