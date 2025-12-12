
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
            } else if (q.type === 'coding') {
                isCorrect = !!ans && ans.length > 10;
            }

            if (isCorrect) score += 1;

            results[q.id] = {
                questionId: q.id,
                timeTakenSeconds: 0,
                status: isCorrect ? 'correct' : 'incorrect',
                score: isCorrect ? 1 : 0,
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
            totalScore: questions.length,
            status: "completed",
            answers: results,
        };

        await setDoc(doc(db, "results", resultId), resultData);
        router.push(`/results/${resultId}`);
    };

    return (
        <div className="flex gap-6 max-w-7xl mx-auto p-6">
            <div className="w-3/4">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-2xl font-bold">{quiz.title}</h1>
                        <p className="text-gray-500">Question {currentIndex + 1} of {questions.length}</p>
                    </div>
                    <div className="text-xl font-mono bg-gray-100 px-3 py-1 rounded">
                        60:00
                    </div>
                </div>

                <Card className="min-h-[600px] flex flex-col">
                    <CardHeader className="flex flex-row justify-between items-start">
                        <div>
                            <CardTitle className="text-lg">{currentQuestion.title}</CardTitle>
                            <div className="text-gray-600 prose" dangerouslySetInnerHTML={{ __html: currentQuestion.description }} />
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleToggleFlag} title="Flag for review">
                            <Flag className={cn("h-5 w-5", flagged[currentQuestion.id] ? "text-yellow-500 fill-yellow-500" : "text-gray-400")} />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1">
                        {currentQuestion.type === 'mcq' ? (
                            <MCQView
                                question={currentQuestion}
                                selectedOption={answers[currentQuestion.id]}
                                onSelect={handleAnswer}
                            />
                        ) : (
                            <CodingView
                                question={currentQuestion}
                                currentCode={answers[currentQuestion.id] || currentQuestion.starterCode}
                                onCodeChange={handleAnswer}
                            />
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between border-t pt-6 bg-gray-50">
                        <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
                            Previous
                        </Button>
                        {isLastQuestion ? (
                            <Button onClick={handleSubmit} disabled={submitting}>
                                {submitting ? "Submitting..." : "Submit Quiz"}
                            </Button>
                        ) : (
                            <Button onClick={handleNext}>
                                Next
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
            <div className="w-1/4 space-y-4">
                <h3 className="font-bold text-lg">Questions</h3>
                <div className="grid grid-cols-5 gap-2">
                    {questions.map((q, index) => {
                        const isAnswered = answers[q.id] !== undefined;
                        const isFlagged = flagged[q.id];
                        const isCurrent = index === currentIndex;

                        return (
                            <button
                                key={q.id}
                                onClick={() => handleQuestionJump(index)}
                                className={cn(
                                    "h-10 w-10 flex items-center justify-center rounded border transition-colors",
                                    isCurrent ? "ring-2 ring-blue-500 ring-offset-2" : "",
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
                <div className="space-y-2 text-sm text-gray-600 pt-4">
                    <div className="flex items-center gap-2"><div className="h-4 w-4 rounded border bg-white"></div> Not Answered</div>
                    <div className="flex items-center gap-2"><div className="h-4 w-4 rounded border bg-green-100 border-green-400"></div> Answered</div>
                    <div className="flex items-center gap-2"><div className="h-4 w-4 rounded border bg-yellow-100 border-yellow-400"></div> Flagged</div>
                    <div className="flex items-center gap-2"><div className="h-4 w-4 rounded border ring-2 ring-blue-500"></div> Current</div>
                </div>
            </div>
        </div>
    );
}
