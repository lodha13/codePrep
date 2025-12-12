
"use client";

import { useState } from "react";
import { Quiz, Question, QuestionResult, QuizResult } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import MCQView from "./MCQView";
import CodingView from "./CodingView";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizRunnerProps {
    quiz: Quiz;
    questions: Question[];
}

export default function QuizRunner({ quiz, questions }: QuizRunnerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [flagged, setFlagged] = useState<Record<string, boolean>>({});
    const [submitting, setSubmitting] = useState(false);
    const { user } = useAuth();
    const router = useRouter();

    const currentQuestion = questions[currentIndex];
    const isLastQuestion = currentIndex === questions.length - 1;

    const handleAnswer = (val: string) => {
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
    };

    const handleNext = () => {
        if (!isLastQuestion) setCurrentIndex(prev => prev + 1);
    };

    const handlePrev = () => {
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    };

    const handleQuestionJump = (index: number) => {
        setCurrentIndex(index);
    };

    const handleToggleFlag = () => {
        setFlagged(prev => ({ ...prev, [currentQuestion.id]: !prev[currentQuestion.id] }));
    };

    const calculateScore = () => {
        let score = 0;
        const results: Record<string, QuestionResult> = {};

        questions.forEach(q => {
            const ans = answers[q.id];
            let isCorrect = false;

            if (q.type === 'mcq') {
                isCorrect = ans === q.correctOptionIndex.toString();
            } else if (q.type === 'coding' && q.solutionCode) {
                 // Simple check: compare submitted code to solution, ignoring whitespace.
                 // This replaces the external API call.
                isCorrect = !!ans && ans.replace(/\s/g, '') === q.solutionCode.replace(/\s/g, '');
            }

            if (isCorrect) score += 10; // Award 10 points per correct question

            results[q.id] = {
                questionId: q.id,
                timeTakenSeconds: 0,
                status: isCorrect ? 'correct' : 'incorrect',
                score: isCorrect ? 10 : 0,
                userAnswer: ans,
            };
        });
        return { score, results };
    };

    const handleSubmit = async () => {
        if (!user) return;
        setSubmitting(true);

        const { score, results } = calculateScore();
        const resultId = `${quiz.id}_${user.uid}_${Date.now()}`;

        const resultData: QuizResult = {
            id: resultId,
            quizId: quiz.id,
            userId: user.uid,
            startedAt: Timestamp.now(),
            completedAt: Timestamp.now(),
            score,
            totalScore: questions.length * 10,
            status: "completed",
            answers: results,
        };

        await setDoc(doc(db, "results", resultId), resultData);
        router.push(`/results/${resultId}`);
    };

    if (!currentQuestion) {
        return <div className="p-8 text-center">Loading questions...</div>;
    }

    return (
        <div className="flex h-screen bg-white">
            <div className="w-1/4 max-w-[280px] border-r flex flex-col">
                 <div className="p-4 border-b">
                    <h3 className="font-bold text-lg">{quiz.title}</h3>
                    <p className="text-sm text-gray-500">Time remaining: 60:00</p>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                    <h3 className="font-bold text-sm mb-3">Questions ({questions.length})</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {questions.map((q, index) => {
                            const isAnswered = answers[q.id] !== undefined;
                            const isFlagged = flagged[q.id];
                            const isCurrent = index === currentIndex;

                            return (
                                <button
                                    key={q.id}
                                    onClick={() => handleQuestionJump(index)}
                                    className={cn(
                                        "h-9 w-9 flex items-center justify-center rounded border transition-colors text-sm",
                                        isCurrent ? "ring-2 ring-primary ring-offset-2" : "",
                                        isFlagged ? "bg-yellow-100 border-yellow-400" : "bg-white",
                                        isAnswered && !isFlagged ? "bg-green-100 border-green-400" : "",
                                        !isAnswered && !isFlagged ? "hover:bg-gray-100" : ""
                                    )}
                                >
                                    {index + 1}
                                </button>
                            );
                        })}
                    </div>
                     <div className="space-y-2 text-xs text-gray-600 pt-6">
                        <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm border bg-white"></div> Not Answered</div>
                        <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm border bg-green-100 border-green-400"></div> Answered</div>
                        <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm border bg-yellow-100 border-yellow-400"></div> Flagged</div>
                        <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm border ring-1 ring-primary"></div> Current</div>
                    </div>
                </div>
                 <div className="p-4 border-t">
                    <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                        {submitting ? "Submitting..." : "Submit Quiz"}
                    </Button>
                </div>
            </div>
            <main className="flex-1 flex flex-col">
                {currentQuestion.type === 'mcq' ? (
                     <div className="flex flex-col h-full">
                        <div className="flex-1 p-8 overflow-y-auto">
                           <MCQView
                                question={currentQuestion}
                                selectedOption={answers[currentQuestion.id]}
                                onSelect={handleAnswer}
                            />
                        </div>
                        <div className="flex justify-between border-t p-4 bg-gray-50">
                            <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
                                Previous
                            </Button>
                            <Button onClick={handleNext} disabled={isLastQuestion}>
                                Next
                            </Button>
                        </div>
                    </div>
                ) : (
                    <CodingView
                        question={currentQuestion}
                        currentCode={answers[currentQuestion.id] || currentQuestion.starterCode}
                        onCodeChange={handleAnswer}
                    />
                )}
            </main>
        </div>
    );
}
