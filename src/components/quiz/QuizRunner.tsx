"use client";

import { useState, useEffect } from "react";
import { Quiz, Question, QuestionResult, QuizResult } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import MCQView from "./MCQView";
import CodingView from "./CodingView";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface QuizRunnerProps {
    quiz: Quiz;
    questions: Question[];
}

export default function QuizRunner({ quiz, questions }: QuizRunnerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
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

    const calculateScore = () => {
        let score = 0;
        const results: Record<string, QuestionResult> = {};

        questions.forEach(q => {
            const ans = answers[q.id];
            let isCorrect = false;

            if (q.type === 'mcq') {
                isCorrect = ans === q.correctOptionIndex.toString();
            } else if (q.type === 'coding') {
                // Simplified checking for prototype: if any code was written
                // In production, this would be a backend verification
                isCorrect = !!ans && ans.length > 10;
            }

            if (isCorrect) score += 1; // Simple 1 point per question

            results[q.id] = {
                questionId: q.id,
                timeTakenSeconds: 0, // Track time if needed
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
            startedAt: Timestamp.now(), // Approximate
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
        <div className="max-w-5xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">{quiz.title}</h1>
                    <p className="text-gray-500">Question {currentIndex + 1} of {questions.length}</p>
                </div>
                <div className="text-xl font-mono bg-gray-100 px-3 py-1 rounded">
                    {/* Timer would go here */}
                    60:00
                </div>
            </div>

            <Card className="min-h-[600px] flex flex-col">
                <CardHeader>
                    <CardTitle className="text-lg">{currentQuestion.title}</CardTitle>
                    <div className="text-gray-600 prose" dangerouslySetInnerHTML={{ __html: currentQuestion.description }} />
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
    );
}
