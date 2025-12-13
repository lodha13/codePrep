
"use client";

import { useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateQuizAction, seedQuizAction } from "./actions";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { ArrowLeft, Wand2, DatabaseZap } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const initialState = {
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
    const [generateState, generateFormAction] = useActionState(generateQuizAction, initialState);
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
                        <div className="grid gap-2">
                            <Label htmlFor="topic">Topic</Label>
                            <Input
                                id="topic"
                                name="topic"
                                placeholder="e.g., Java Data Structures, Python Algorithms"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
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

            </Card>
        </div>
    );
}


    