
"use client";

import { useState } from "react";
import { Quiz, Question, QuestionResult, QuizResult, MCQQuestion, CodingQuestion } from "@/types/schema";
import { Button } from "@/components/ui/button";
import MCQView from "./MCQView";
import CodingView from "./CodingView";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Flag, ChevronLeft, ChevronRight } from "lucide-react";
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
                isCorrect = ans === (q as MCQQuestion).correctOptionIndex.toString();
            } else if (q.type === 'coding') {
                const codingQ = q as CodingQuestion;
                 // Simple check: compare submitted code to solution, ignoring whitespace.
                isCorrect = !!ans && !!codingQ.solutionCode && ans.replace(/\s/g, '') === codingQ.solutionCode.replace(/\s/g, '');
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
            startedAt: Timestamp.now(), // This should be set when the quiz actually starts
            completedAt: Timestamp.now(),
            score,
            totalScore: questions.length * 10,
            status: "completed",
            answers: results,
        };

        // Save the result to the user-specific collection
        const resultDocRef = doc(db, "users", user.uid, "results", resultId);
        await setDoc(resultDocRef, resultData);

        // Also save to the top-level results collection for the results page to work
        // This is denormalization.
        await setDoc(doc(db, "results", resultId), resultData);

        router.push(`/results/${resultId}`);
    };

    if (!currentQuestion) {
        return <div className="p-8 text-center">Loading questions...</div>;
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <div className="w-1/4 max-w-[280px] border-r flex flex-col bg-white">
                 <div className="p-4 border-b">
                    <h3 className="font-bold text-lg truncate">{quiz.title}</h3>
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
                                        "h-9 w-9 flex items-center justify-center rounded border transition-colors text-sm relative",
                                        isCurrent ? "ring-2 ring-primary ring-offset-2" : "",
                                        isAnswered && !isFlagged ? "bg-green-100 border-green-400 text-green-800 font-semibold" : "hover:bg-gray-100",
                                    )}
                                >
                                    {isFlagged && <Flag className="absolute top-[-4px] right-[-4px] h-3 w-3 text-yellow-500 fill-yellow-400" />}
                                    {index + 1}
                                </button>
                            );
                        })}
                    </div>
                     <div className="space-y-2 text-xs text-gray-600 pt-6">
                        <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm border bg-white"></div> Not Answered</div>
                        <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm border bg-green-100 border-green-400"></div> Answered</div>
                        <div className="flex items-center gap-2"><Flag className="h-3 w-3 text-yellow-500 fill-yellow-400"/> Flagged for Review</div>
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
                <div className="flex-1 overflow-y-auto">
                     {currentQuestion.type === 'mcq' ? (
                        <MCQView
                            question={currentQuestion as MCQQuestion}
                            selectedOption={answers[currentQuestion.id]}
                            onSelect={handleAnswer}
                        />
                     ) : (
                        <CodingView
                            question={currentQuestion as CodingQuestion}
                            currentCode={answers[currentQuestion.id] || (currentQuestion as CodingQuestion).starterCode || ""}
                            onCodeChange={handleAnswer}
                        />
                     )}
                </div>
                <div className="flex justify-between items-center border-t p-3 bg-white">
                    <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
                        <ChevronLeft className="h-4 w-4 mr-1"/>
                        Previous
                    </Button>
                     <Button variant="outline" onClick={handleToggleFlag} size="icon">
                        <Flag className={cn("h-4 w-4", flagged[currentQuestion.id] && "text-yellow-500 fill-yellow-400")} />
                    </Button>
                    <Button onClick={handleNext} disabled={isLastQuestion}>
                        {isLastQuestion ? 'Finish' : 'Next'}
                         <ChevronRight className="h-4 w-4 ml-1"/>
                    </Button>
                </div>
            </main>
        </div>
    );
}
