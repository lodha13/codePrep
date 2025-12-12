
"use client";

import { useState } from "react";
import { Quiz, Question, QuestionResult, QuizResult, MCQQuestion, CodingQuestion } from "@/types/schema";
import { Button } from "@/components/ui/button";
import MCQView from "./MCQView";
import CodingView from "./CodingView";
import { doc, Timestamp, writeBatch, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Flag, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { executeCode } from "@/lib/code-execution";

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

    const handleNavigation = () => {
        if (isLastQuestion) {
            handleSubmit();
        } else {
            setCurrentIndex(prev => prev + 1);
        }
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

    const calculateScore = async () => {
        let totalQuizScore = 0;
        let maxQuizScore = 0;
        const results: Record<string, QuestionResult> = {};

        for (const q of questions) {
            const userAnswer = answers[q.id];
            let questionScore = 0;
            let questionMaxScore = 0;
            let status: "correct" | "incorrect" | "partial" = "incorrect";

            if (q.type === 'mcq') {
                const mcq = q as MCQQuestion;
                questionMaxScore = 10; // Fixed score for MCQs
                const isCorrect = userAnswer === mcq.correctOptionIndex.toString();
                if (isCorrect) {
                    questionScore = 10;
                    status = 'correct';
                }
            } else if (q.type === 'coding') {
                const codingQ = q as CodingQuestion;
                questionMaxScore = codingQ.testCases.length;
                const executionResult = await executeCode(userAnswer, codingQ.solutionCode, codingQ.testCases);
                questionScore = executionResult.passed_tests || 0;
                
                if (questionScore === questionMaxScore) {
                    status = 'correct';
                } else if (questionScore > 0) {
                    status = 'partial';
                }
            }
            
            totalQuizScore += questionScore;
            maxQuizScore += questionMaxScore;

            results[q.id] = {
                questionId: q.id,
                timeTakenSeconds: 0, // Placeholder
                status,
                score: questionScore,
                total: questionMaxScore,
                userAnswer: userAnswer || "",
            };
        }
        return { score: totalQuizScore, totalScore: maxQuizScore, results };
    };

    const handleSubmit = async () => {
        if (!user) return;
        
        const answeredQuestionsCount = Object.keys(answers).filter(key => answers[key] !== undefined && answers[key] !== '').length;
        const totalQuestionsCount = questions.length;

        if (answeredQuestionsCount < totalQuestionsCount) {
            const confirmed = window.confirm(
                `You have only answered ${answeredQuestions_count} out of ${totalQuestionsCount} questions. Are you sure you want to submit?`
            );
            if (!confirmed) {
                return; // Abort submission
            }
        }

        setSubmitting(true);

        const { score, totalScore, results } = await calculateScore();
        const resultId = `${quiz.id}_${user.uid}_${Date.now()}`;

        const resultData: Omit<QuizResult, 'id'> = {
            quizId: quiz.id,
            quizTitle: quiz.title, // Denormalize quiz title for faster reads on profile page
            userId: user.uid,
            startedAt: Timestamp.now(), // This should be set when the quiz actually starts
            completedAt: Timestamp.now(),
            score,
            totalScore,
            status: "completed",
            answers: results,
        };

        const batch = writeBatch(db);

        // 1. Save the detailed result to the top-level results collection
        const topLevelResultDocRef = doc(db, "results", resultId);
        batch.set(topLevelResultDocRef, resultData);
        
        // 2. Update the user's document with the completed quiz ID
        const userDocRef = doc(db, "users", user.uid);
        batch.update(userDocRef, {
            completedQuizIds: arrayUnion(quiz.id)
        });

        await batch.commit();

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
                            const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
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
                    <p className="text-xs text-center text-muted-foreground">
                        Navigate using the buttons below or submit on the final question.
                    </p>
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
                    <Button onClick={handleNavigation} disabled={submitting}>
                        {submitting ? "Submitting..." : (isLastQuestion ? 'Submit' : 'Next')}
                         {!isLastQuestion && <ChevronRight className="h-4 w-4 ml-1"/>}
                    </Button>
                </div>
            </main>
        </div>
    );
}
