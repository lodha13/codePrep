
"use client";

import { useEffect, useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateQuizAction, seedQuizAction, uploadQuizJsonAction } from "./actions";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { ArrowLeft, Wand2, DatabaseZap, Upload } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const initialState = {
    message: "",
    success: false,
};

const uploadInitialState = {
    message: "",
    success: false,
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? (
                "Generating..."
            ) : (
                <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Quiz with AI
                </>
            )}
        </Button>
    );
}

function SeedButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full" variant="secondary">
            {pending ? (
                "Seeding..."
            ) : (
                <>
                    <DatabaseZap className="mr-2 h-4 w-4" />
                    Seed Java Multithreading Quiz
                </>
            )}
        </Button>
    );
}

export default function GenerateQuizPage() {
    const [jsonContent, setJsonContent] = useState("");
    const [generateState, generateFormAction] = useActionState(generateQuizAction, initialState);
    const [uploadState, uploadFormAction] = useActionState(uploadQuizJsonAction, uploadInitialState);
    const [seedState, seedFormAction] = useActionState(async (previousState: any, formData: FormData) => {
        const result = await seedQuizAction();
        return result;
    }, initialState);

    const { toast } = useToast();

    useEffect(() => {
        if (generateState.message) {
            toast({
                title: generateState.success ? "Quiz Generated!" : "Generation Failed",
                description: generateState.message,
                variant: generateState.success ? "default" : "destructive",
            });
            
            // Auto-download JSON if generation was successful
            if (generateState.success && generateState.downloadData) {
                const dataStr = JSON.stringify(generateState.downloadData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${generateState.downloadData.quiz.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
        }
    }, [generateState, toast]);

    useEffect(() => {
        if (seedState.message) {
            toast({
                title: seedState.success ? "Quiz Seeded!" : "Seeding Failed",
                description: seedState.message,
                variant: seedState.success ? "default" : "destructive",
            });
        }
    }, [seedState, toast]);

    useEffect(() => {
        if (uploadState.message) {
            toast({
                title: uploadState.success ? "Upload Successful!" : "Upload Failed",
                description: uploadState.message,
                variant: uploadState.success ? "default" : "destructive",
            });
            if (uploadState.success) {
                setJsonContent("");
            }
        }
    }, [uploadState, toast]);

    const handleUploadSubmit = async (formData: FormData) => {
        formData.set('jsonContent', jsonContent);
        await uploadFormAction(formData);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                setJsonContent(content);
            };
            reader.readAsText(file);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
             <Link href="/admin/quizzes" className="flex items-center text-sm text-muted-foreground hover:underline">
                <ArrowLeft className="mr-2 h-4 w-4"/>
                Back to Quizzes
            </Link>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <Wand2 className="h-6 w-6" />
                        AI Quiz Generator
                    </CardTitle>
                    <CardDescription>
                        Describe the quiz you want to create, and the AI will generate it for you.
                    </CardDescription>
                </CardHeader>
                <form action={generateFormAction}>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="category">Category</Label>
                                <Input
                                    id="category"
                                    name="category"
                                    placeholder="e.g., Programming, DevOps, Database"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="subCategory">Sub-Category (Optional)</Label>
                                <Input
                                    id="subCategory"
                                    name="subCategory"
                                    placeholder="e.g., Data Structures, Algorithms"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="language">Programming Language (Optional)</Label>
                                <Select name="language">
                                    <SelectTrigger id="language">
                                        <SelectValue placeholder="Select language" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="javascript">JavaScript</SelectItem>
                                        <SelectItem value="python">Python</SelectItem>
                                        <SelectItem value="java">Java</SelectItem>
                                        <SelectItem value="cpp">C++</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="complexity">Complexity</Label>
                                <Select name="complexity" defaultValue="medium" required>
                                    <SelectTrigger id="complexity">
                                        <SelectValue placeholder="Select complexity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="easy">Easy</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="hard">Hard</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="numberOfQuestions">Number of Questions</Label>
                            <Input
                                id="numberOfQuestions"
                                name="numberOfQuestions"
                                type="number"
                                defaultValue={10}
                                min={1}
                                max={30}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="customPrompt">Custom Requirements (Optional)</Label>
                            <Textarea
                                id="customPrompt"
                                name="customPrompt"
                                placeholder="e.g., Focus on real-world scenarios, include security aspects"
                                rows={3}
                            />
                        </div>

                         <SubmitButton />

                    </CardContent>
                </form>

                <Separator className="my-6" />

                <CardHeader>
                     <CardTitle className="text-xl font-headline flex items-center gap-2">
                        <DatabaseZap className="h-5 w-5" />
                        Seed Database
                    </CardTitle>
                    <CardDescription>
                        For demonstration purposes, you can add a pre-made quiz about Java Multithreading to the database.
                    </CardDescription>
                </CardHeader>
                 <form action={seedFormAction}>
                    <CardContent>
                        <SeedButton />
                    </CardContent>
                </form>

                <Separator className="my-6" />

                <CardHeader>
                    <CardTitle className="text-xl font-headline flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Upload Quiz JSON
                    </CardTitle>
                    <CardDescription>
                        Upload the generated JSON file after reviewing it, or upload any quiz JSON file.
                    </CardDescription>
                </CardHeader>
                
                <form action={handleUploadSubmit}>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="file">Upload JSON File</Label>
                            <input
                                id="file"
                                type="file"
                                accept=".json"
                                onChange={handleFileUpload}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        
                        <div className="grid gap-2">
                            <Label htmlFor="jsonContent">JSON Content</Label>
                            <Textarea
                                id="jsonContent"
                                value={jsonContent}
                                onChange={(e) => setJsonContent(e.target.value)}
                                placeholder="Paste your JSON content here or upload a file above..."
                                rows={15}
                                className="font-mono text-sm"
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={!jsonContent.trim()}>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Quiz to Database
                        </Button>
                    </CardContent>
                </form>

            </Card>
        </div>
    );
}


    