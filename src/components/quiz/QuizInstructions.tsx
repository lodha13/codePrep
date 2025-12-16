
'use client';

import { useState } from 'react';
import { Quiz, User } from '@/types/schema';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Monitor, ArrowRight, Laptop } from 'lucide-react';
import { useToast } from '../ui/use-toast';

interface QuizInstructionsProps {
    quiz: Quiz;
    user: User;
    onStart: () => void;
}

export default function QuizInstructions({ quiz, user, onStart }: QuizInstructionsProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const requestFullscreen = async () => {
        setLoading(true);
        const element = document.documentElement;
        try {
            if (element.requestFullscreen) {
                await element.requestFullscreen();
            } else if ((element as any).webkitRequestFullscreen) {
                await (element as any).webkitRequestFullscreen();
            } else if ((element as any).msRequestFullscreen) {
                await (element as any).msRequestFullscreen();
            }
            onStart();
        } catch (error) {
            console.error("Fullscreen request failed:", error);
            toast({
                variant: 'destructive',
                title: "Fullscreen Required",
                description: "Please enable fullscreen mode in your browser to start the quiz.",
            });
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-screen items-center justify-center bg-gray-100 p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold font-headline">{quiz.title}</CardTitle>
                    <CardDescription className="text-md mt-2">{quiz.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-around text-center text-sm text-muted-foreground">
                        <div className="flex flex-col items-center gap-1">
                            <span className="font-bold">{quiz.questionIds.length}</span>
                            <span>Questions</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <span className="font-bold">{quiz.durationMinutes}</span>
                            <span>Minutes</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <span className="font-bold">{quiz.totalMarks || quiz.questionIds.length * (quiz.type === 'assessment' ? 10 : 1)}</span>
                            <span>Max Score</span>
                        </div>
                    </div>

                    <div className="rounded-lg border bg-secondary p-6 space-y-4">
                        <h3 className="text-lg font-semibold flex items-center">
                            <ShieldAlert className="h-5 w-5 mr-2 text-destructive" />
                            Important Rules
                        </h3>
                        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                            <li>
                                This test will be conducted in a **proctored, full-screen environment**.
                            </li>
                            <li>
                                Exiting full-screen mode or switching to another tab/application **will automatically terminate the quiz**.
                            </li>
                            <li>
                                Ensure you have a stable internet connection before starting.
                            </li>
                             <li>
                                Once you submit, you cannot change your answers.
                            </li>
                        </ul>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col items-center">
                    <Button onClick={requestFullscreen} disabled={loading} size="lg" className="w-full max-w-xs">
                        {loading ? "Starting..." : (
                            <>
                                Start Quiz in Fullscreen
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                     <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
                        <Laptop className="h-3 w-3" /> Best experienced on a desktop browser.
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
