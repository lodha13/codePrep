
"use client";

import { useState, useEffect } from "react";
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
    session: QuizResult;
}

export default function QuizRunner({ quiz, questions, session }: QuizRunnerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, { userAnswer: string }>>(() => {
        // Only load from localStorage for current session, never from database
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(`quiz-${session.id}-answers`);
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    console.warn('Failed to parse saved answers:', e);
                }
            }
        }
        return {}; // Start fresh, no pre-populated answers
    });
    const [flagged, setFlagged] = useState<Record<string, boolean>>({});
    const [submitting, setSubmitting] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    
    const { user, updateUserCache } = useAuth();
    const router = useRouter();

    // Cleanup localStorage on component mount and unmount
    useEffect(() => {
        // Clean up any existing localStorage for this session on mount
        if (typeof window !== 'undefined') {
            localStorage.removeItem(`quiz-${session.id}-answers`);
        }
        
        // Cleanup on unmount
        return () => {
            if (typeof window !== 'undefined') {
                localStorage.removeItem(`quiz-${session.id}-answers`);
            }
        };
    }, [session.id]);

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
        setIsCompleting(true);
        
        let totalQuizScore = 0;
        let maxQuizScore = 0;
        const finalAnswers: Record<string, QuestionResult> = {};

        for (const q of questions) {
            const currentAnswer = answers[q.id];
            const userAnswer = currentAnswer?.userAnswer;
            
            let questionScore = 0;
            let status: QuestionResult['status'] = "unanswered";
            
            // Safeguard: Default mark if not present in the document.
            const questionTotalMarks = q.mark ?? (q.type === 'coding' ? 10 : 1);
            
            let questionResult: Partial<Omit<QuestionResult, 'questionId'>> = {
                userAnswer: userAnswer || "",
            };

            if (userAnswer && userAnswer.trim() !== '') {
                 if (q.type === 'mcq') {
                    const mcq = q as MCQQuestion;
                    const isCorrect = userAnswer === mcq.correctOptionIndex.toString();
                    if (isCorrect) {
                        questionScore = questionTotalMarks;
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
                        questionScore = (passedTests / totalTests) * questionTotalMarks;
                    }
                    
                    if (executionResult.test_case_results) {
                        questionResult.testCaseResults = executionResult.test_case_results;
                    }
                    
                    if (passedTests === totalTests && totalTests > 0) {
                        status = 'correct';
                    } else if (passedTests > 0) {
                        status = 'partial';
                    } else {
                        status = 'incorrect';
                    }
                }
            } else {
                status = "unanswered";
                questionScore = 0;
            }
            
            totalQuizScore += questionScore;
            maxQuizScore += questionTotalMarks; 

            finalAnswers[q.id] = {
                questionId: q.id,
                score: questionScore,
                status: status,
                total: questionTotalMarks,
                userAnswer: questionResult.userAnswer,
                // Only include testCaseResults if they exist
                ...(questionResult.testCaseResults && { testCaseResults: questionResult.testCaseResults }),
            };
        }

        const batch = writeBatch(db);

        const resultDocRef = doc(db, "results", session.id);
        const completedAt = Timestamp.now();
        const startTime = session.startedAt instanceof Timestamp ? session.startedAt : Timestamp.fromDate(new Date(session.startedAt));
        const timeTakenSeconds = completedAt.seconds - startTime.seconds;

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
        
        // Clear localStorage after successful submission
        if (typeof window !== 'undefined') {
            localStorage.removeItem(`quiz-${session.id}-answers`);
        }
        
        setHasUnsavedChanges(false);
        
        // Navigate directly to results - no cache update needed here
        router.replace(`/results/${session.id}`);
    };
    


    const handleAnswer = (val: string) => {
        const newAnswers = { 
            ...answers, 
            [currentQuestion.id]: { 
                userAnswer: val,
            }
        };
        setAnswers(newAnswers);
        setHasUnsavedChanges(true);
        
        // Save to localStorage for persistence across page refreshes
        if (typeof window !== 'undefined') {
            localStorage.setItem(`quiz-${session.id}-answers`, JSON.stringify(newAnswers));
        }
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
                     {hasUnsavedChanges && (
                         <p className="text-xs text-amber-600 mb-2 text-center">
                             💾 Answers saved locally - Submit to save permanently
                         </p>
                     )}
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
                        {isLastQuestion ? 'Finish & Submit' : 'Next'}
                         {!isLastQuestion && <ChevronRight className="h-4 w-4 ml-1"/>}
                    </Button>
                </div>
            </main>
        </div>
    );
}
