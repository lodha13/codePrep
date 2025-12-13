
"use client";

import { useState } from "react";
import { Quiz, Question, QuestionResult, QuizResult, MCQQuestion, CodingQuestion } from "@/types/schema";
import { Button } from "@/components/ui/button";
import MCQView from "./MCQView";
import CodingView from "./CodingView";
import { doc, Timestamp, writeBatch, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Flag, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { executeCode } from "@/lib/code-execution";
import { useDebouncedCallback } from "use-debounce";

interface QuizRunnerProps {
    quiz: Quiz;
    questions: Question[];
    session: QuizResult;
}

export default function QuizRunner({ quiz, questions, session }: QuizRunnerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, { userAnswer: string }>>(() => session.answers || {});
    const [flagged, setFlagged] = useState<Record<string, boolean>>({});
    const [submitting, setSubmitting] = useState(false);
    
    const { user } = useAuth();
    const router = useRouter();

    const handleSubmit = async () => {
        if (!user || submitting) return;
        
        const answeredQuestionsCount = Object.values(answers).filter(a => a.userAnswer && a.userAnswer.trim() !== '').length;
        const totalQuestionsCount = questions.length;

        if (answeredQuestionsCount < totalQuestionsCount) {
            const confirmed = window.confirm(
                `You have only answered ${answeredQuestionsCount} out of ${totalQuestionsCount} questions. Are you sure you want to submit?`
            );
            if (!confirmed) {
                return;
            }
        }
        
        setSubmitting(true);
        
        let totalQuizScore = 0;
        let maxQuizScore = 0;
        const finalAnswers: Record<string, QuestionResult> = {};

        for (const q of questions) {
            const currentAnswer = answers[q.id];
            const userAnswer = currentAnswer?.userAnswer;
            
            let questionScore = 0;
            let status: QuestionResult['status'] = "incorrect";
            let resultPayload: Partial<QuestionResult> = {
                questionId: q.id,
                userAnswer: userAnswer || "",
                total: 10,
            };

            if (!userAnswer || userAnswer.trim() === '') {
                status = "unanswered";
                questionScore = 0;
            } else if (q.type === 'mcq') {
                const mcq = q as MCQQuestion;
                const isCorrect = userAnswer === mcq.correctOptionIndex.toString();
                if (isCorrect) {
                    questionScore = 10;
                    status = 'correct';
                } else {
                    questionScore = 0;
                    status = 'incorrect';
                }
            } else if (q.type === 'coding') {
                const codingQ = q as CodingQuestion;
                const executionResult = await executeCode(userAnswer, codingQ.language, codingQ.testCases);
                
                const passedTests = executionResult.test_case_results?.filter(r => r.passed).length || 0;
                const totalTests = codingQ.testCases.length;
                
                if (totalTests > 0) {
                     questionScore = Math.round((passedTests / totalTests) * 10);
                } else {
                    questionScore = 0;
                }
                
                resultPayload.testCaseResults = executionResult.test_case_results;
                
                if (passedTests === totalTests && totalTests > 0) {
                    status = 'correct';
                } else if (passedTests > 0) {
                    status = 'partial';
                } else {
                    status = 'incorrect';
                }
            }
            
            totalQuizScore += questionScore;
            maxQuizScore += 10; 

            resultPayload.score = questionScore;
            resultPayload.status = status;
            
            finalAnswers[q.id] = resultPayload as QuestionResult;
        }

        const batch = writeBatch(db);

        const resultDocRef = doc(db, "results", session.id);
        const completedAt = Timestamp.now();
        const timeTakenSeconds = completedAt.seconds - (session.startedAt as Timestamp).seconds;

        batch.update(resultDocRef, {
            answers: finalAnswers,
            score: totalQuizScore,
            totalScore: maxQuizScore,
            status: "completed",
            completedAt,
            timeTakenSeconds
        });
        
        const userDocRef = doc(db, "users", user.uid);
        batch.update(userDocRef, {
            completedQuizIds: arrayUnion(quiz.id)
        });

        await batch.commit();

        router.push(`/results/${session.id}`);
    };
    
    const saveProgress = useDebouncedCallback(async (newAnswers: Record<string, { userAnswer: string }>) => {
        if (!session || !user) return;
        const resultDocRef = doc(db, "results", session.id);
        await updateDoc(resultDocRef, {
            answers: newAnswers,
        });
    }, 1500);

    const handleAnswer = (val: string) => {
        const newAnswers = { 
            ...answers, 
            [currentQuestion.id]: { 
                userAnswer: val,
            }
        };
        setAnswers(newAnswers);
        saveProgress(newAnswers);
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

    const currentQuestion = questions[currentIndex];
    const isLastQuestion = currentIndex === questions.length - 1;

    if (!currentQuestion) {
        return <div className="p-8 text-center">Loading questions...</div>;
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <div className="w-1/4 max-w-[280px] border-r flex flex-col bg-white">
                 <div className="p-4 border-b">
                    <h3 className="font-bold text-lg truncate">{quiz.title}</h3>
                    <p className="text-sm text-gray-500">Questions: {questions.length}</p>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                    <h3 className="font-bold text-sm mb-3">Questions ({questions.length})</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {questions.map((q, index) => {
                            const isAnswered = answers[q.id]?.userAnswer !== undefined && answers[q.id]?.userAnswer !== '';
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
                     <Button onClick={() => handleSubmit()} disabled={submitting} className="w-full">
                        {submitting ? "Submitting..." : "Submit Quiz"}
                    </Button>
                </div>
            </div>
            <main className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto">
                     {currentQuestion.type === 'mcq' ? (
                        <MCQView
                            question={currentQuestion as MCQQuestion}
                            selectedOption={answers[currentQuestion.id]?.userAnswer}
                            onSelect={handleAnswer}
                        />
                     ) : (
                        <CodingView
                            question={currentQuestion as CodingQuestion}
                            currentCode={answers[currentQuestion.id]?.userAnswer || (currentQuestion as CodingQuestion).starterCode || ""}
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
                        {isLastQuestion ? 'Finish & Submit' : 'Save & Next'}
                         {!isLastQuestion && <ChevronRight className="h-4 w-4 ml-1"/>}
                    </Button>
                </div>
            </main>
        </div>
    );
}
