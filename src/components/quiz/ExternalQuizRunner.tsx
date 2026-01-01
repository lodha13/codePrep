
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Quiz, Question, QuestionResult, ExternalCandidate, MCQQuestion, CodingQuestion } from "@/types/schema";
import { Button } from "@/components/ui/button";
import MCQView from "./MCQView";
import CodingView from "./CodingView";
import { doc, Timestamp, writeBatch, addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Flag, ChevronLeft, ChevronRight, PanelLeft, X, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { executeCode } from "@/lib/code-execution";
import { useToast } from "@/components/ui/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import CameraView, { CameraViewHandle } from './CameraView';

// Redefine types to expect strings for serialized date fields
type SerializableExternalCandidate = Omit<ExternalCandidate, 'createdAt' | 'expiresAt'> & {
    createdAt: string;
    expiresAt: string;
};
type SerializableQuiz = Omit<Quiz, 'createdAt'> & {
    createdAt: string;
};
type SerializableQuestion = Omit<Question, 'createdAt'> & {
    createdAt: string;
};

interface ExternalQuizRunnerProps {
    quiz: SerializableQuiz;
    questions: SerializableQuestion[];
    externalCandidate: SerializableExternalCandidate;
}

export default function ExternalQuizRunner({ quiz, questions, externalCandidate }: ExternalQuizRunnerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, { userAnswer: string }>>({});
    const [flagged, setFlagged] = useState<Record<string, boolean>>({});
    const [submitting, setSubmitting] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [violationCount, setViolationCount] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [warningToastId, setWarningToastId] = useState<string | null>(null);
    const [quizHasStarted, setQuizHasStarted] = useState(false);
    const [showFullscreenVeil, setShowFullscreenVeil] = useState(false);
    const cameraRef = useRef<CameraViewHandle>(null);

    const router = useRouter();
    const { toast, dismiss } = useToast();
    
    const [startTime] = useState(Timestamp.now());

    const handleAnswer = useCallback((val: string) => {
        setAnswers(prev => {
            const newAnswers = { 
                ...prev, 
                [questions[currentIndex].id]: { 
                    userAnswer: val,
                }
            };
            // Save to localStorage for persistence across page refreshes
            if (typeof window !== 'undefined') {
                localStorage.setItem(`quiz-ext-${externalCandidate.id}-answers`, JSON.stringify(newAnswers));
            }
            return newAnswers;
        });
    }, [currentIndex, questions, externalCandidate.id]);


    // Load answers from localStorage on initial render
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(`quiz-ext-${externalCandidate.id}-answers`);
            if (saved) {
                try {
                    setAnswers(JSON.parse(saved));
                } catch (e) {
                    console.warn('Failed to parse saved answers:', e);
                }
            }
        }
    }, [externalCandidate.id]);

    // Effect to set a flag once the quiz has properly started
    useEffect(() => {
        const timer = setTimeout(() => setQuizHasStarted(true), 1500);
        return () => clearTimeout(timer);
    }, []);

    const handleViolation = useCallback(() => {
        if (submitting || !quizHasStarted) return;

        const newCount = violationCount + 1;
        setViolationCount(newCount);

        if (warningToastId) {
            dismiss(warningToastId);
        }

        if (newCount >= 3) {
            handleSubmit({ terminatedByViolation: "Exited fullscreen or switched tabs multiple times." });
        } else {
            const { id } = toast({
                title: (
                    <div className="flex items-center">
                        <AlertTriangle className="h-6 w-6 text-yellow-500 mr-3" />
                        <span className="font-bold text-lg">Warning: Stay in Fullscreen</span>
                    </div>
                ),
                description: `You have left the quiz window ${newCount} time(s). If you leave ${3 - newCount} more time(s), your quiz will be terminated automatically.`,
                variant: "destructive",
                duration: 10000,
            });
            setWarningToastId(id);
        }
    }, [violationCount, submitting, dismiss, toast, warningToastId, quizHasStarted]);

    // Effect for managing fullscreen and violations
    useEffect(() => {
        const elem = document.documentElement;
        
        const enterFullScreen = () => {
            if (elem.requestFullscreen && !document.fullscreenElement) {
                elem.requestFullscreen().catch(err => {
                    console.warn(`Could not enter full-screen mode: ${err.message}`);
                });
            }
        };

        const handleFullScreenChange = () => {
            const isCurrentlyFullScreen = document.fullscreenElement != null;
            setIsFullScreen(isCurrentlyFullScreen);

            if (quizHasStarted && !isCurrentlyFullScreen && !submitting) {
                handleViolation();
                setShowFullscreenVeil(true);
            } else if (isCurrentlyFullScreen) {
                setShowFullscreenVeil(false);
            }
        };
        
        const handleVisibilityChange = () => {
            if (quizHasStarted && document.hidden && !submitting) {
                handleViolation();
            }
        };

        const handlePageHide = () => {
            cameraRef.current?.stopStream();
        };

        document.addEventListener("fullscreenchange", handleFullScreenChange);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("pagehide", handlePageHide);

        // Define enterFullScreen for the veil button
        (window as any).enterFullScreen = enterFullScreen;

        return () => {
            document.removeEventListener("fullscreenchange", handleFullScreenChange);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("pagehide", handlePageHide);
            delete (window as any).enterFullScreen;
        };
    }, [submitting, handleViolation, quizHasStarted]);
    
    const handleSubmit = async (options: { terminatedByViolation?: string } = {}) => {
        if (submitting) return;

        cameraRef.current?.stopStream();
        
        const { terminatedByViolation } = options;

        if (!terminatedByViolation) {
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
        }
        
        setSubmitting(true);

        if (document.fullscreenElement) {
            await document.exitFullscreen();
        }
        
        let totalQuizScore = 0;
        let maxQuizScore = 0;
        const finalAnswers: Record<string, QuestionResult> = {};

        for (const q of questions) {
            const currentAnswer = answers[q.id];
            const userAnswer = currentAnswer?.userAnswer;
            let questionScore = 0;
            let status: QuestionResult['status'] = "unanswered";
            const questionTotalMarks = q.mark ?? (q.type === 'coding' ? 10 : 1);
            let questionResult: Partial<Omit<QuestionResult, 'questionId'>> = { userAnswer: userAnswer || "" };

            if (userAnswer && userAnswer.trim() !== '') {
                 if (q.type === 'mcq') {
                    const isCorrect = userAnswer === (q as MCQQuestion).correctOptionIndex.toString();
                    status = isCorrect ? 'correct' : 'incorrect';
                    questionScore = isCorrect ? questionTotalMarks : 0;
                } else if (q.type === 'coding') {
                    const codingQ = q as CodingQuestion;
                    const executionResult = await executeCode(userAnswer, codingQ.language, codingQ.testCases);
                    const passedTests = executionResult.test_case_results?.filter(r => r.passed).length || 0;
                    const totalTests = codingQ.testCases.length;
                    
                    if (totalTests > 0) questionScore = (passedTests / totalTests) * questionTotalMarks;
                    if (executionResult.test_case_results) questionResult.testCaseResults = executionResult.test_case_results;
                    
                    if (passedTests === totalTests && totalTests > 0) status = 'correct';
                    else if (passedTests > 0) status = 'partial';
                    else status = 'incorrect';
                }
            }
            
            totalQuizScore += questionScore;
            maxQuizScore += questionTotalMarks; 

            finalAnswers[q.id] = {
                questionId: q.id,
                score: questionScore,
                status: status,
                total: questionTotalMarks,
                userAnswer: questionResult.userAnswer,
                ...(questionResult.testCaseResults && { testCaseResults: questionResult.testCaseResults }),
            };
        }

        const batch = writeBatch(db);
        const completedAt = Timestamp.now();
        const timeTakenSeconds = completedAt.seconds - startTime.seconds;

        const resultPayload: any = {
            externalCandidateId: externalCandidate.id,
            quizId: quiz.id,
            startedAt: startTime,
            answers: finalAnswers,
            score: totalQuizScore,
            totalScore: maxQuizScore,
            status: "completed",
            completedAt,
            timeTakenSeconds
        };

        if (terminatedByViolation) {
            resultPayload.terminationReason = terminatedByViolation;
        }

        // Create new result document
        const resultDocRef = await addDoc(collection(db, "externalCandidateResults"), resultPayload);
        
        // Update the original assignment with the result ID
        const assignmentDocRef = doc(db, "externalCandidates", externalCandidate.id);
        batch.update(assignmentDocRef, { resultId: resultDocRef.id });
        
        await batch.commit();
        
        if (typeof window !== 'undefined') {
            localStorage.removeItem(`quiz-ext-${externalCandidate.id}-answers`);
        }
        
        router.replace(`/quiz/thank-you`);
    };

    const handleNavigation = (nextIndex: number) => {
        if (nextIndex >= 0 && nextIndex < questions.length) {
            setCurrentIndex(nextIndex);
        }
    };

    const handleQuestionJump = (index: number) => {
        setCurrentIndex(index);
        setIsSheetOpen(false); // Close sheet on selection
    };

    const handleToggleFlag = () => {
        setFlagged(prev => ({ ...prev, [currentQuestion.id]: !prev[currentQuestion.id] }));
    };

    const currentQuestion = questions[currentIndex];
    
    if (!currentQuestion) {
        return <div className="p-8 text-center">Loading questions...</div>;
    }

    return (
        <div className="flex h-screen flex-col bg-gray-50 text-foreground">
            {showFullscreenVeil && (
                <div className="fixed inset-0 bg-black bg-opacity-80 z-[100] flex flex-col items-center justify-center text-white">
                    <AlertTriangle className="h-16 w-16 text-yellow-400 mb-6" />
                    <h2 className="text-3xl font-bold mb-3">Fullscreen Mode Required</h2>
                    <p className="text-lg mb-8">You must be in fullscreen to continue the quiz.</p>
                    <Button size="lg" onClick={() => (window as any).enterFullScreen()}>
                        Re-enter Fullscreen
                    </Button>
                </div>
            )}
            <CameraView ref={cameraRef} />
            {/* Header */}
            <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-4">
                <div className="flex items-center gap-4">
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon">
                                <PanelLeft className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[300px] sm:w-[340px]">
                            <SheetHeader>
                                <SheetTitle>{quiz.title}</SheetTitle>
                            </SheetHeader>
                            <div className="py-4">
                                <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
                                    Questions ({questions.length})
                                </h3>
                                <div className="grid grid-cols-5 gap-2">
                                    {questions.map((q, index) => {
                                        const isAnswered = answers[q.id]?.userAnswer?.trim() !== '' && answers[q.id]?.userAnswer !== undefined;
                                        const isFlagged = flagged[q.id];
                                        const isCurrent = index === currentIndex;

                                        return (
                                            <button
                                                key={q.id}
                                                onClick={() => handleQuestionJump(index)}
                                                className={cn(
                                                    "h-10 w-10 flex items-center justify-center rounded border text-sm relative transition-all",
                                                    isCurrent && "ring-2 ring-primary ring-offset-2",
                                                    isFlagged && "bg-yellow-100 border-yellow-400",
                                                    isAnswered && !isFlagged ? "bg-green-100 border-green-400 text-green-800 font-semibold" : "hover:bg-accent"
                                                )}
                                            >
                                                {isFlagged && <Flag className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500 fill-yellow-400" />}
                                                {index + 1}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="mt-6 space-y-2 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2"><div className="h-4 w-4 rounded-sm border bg-white"/> Not Answered</div>
                                    <div className="flex items-center gap-2"><div className="h-4 w-4 rounded-sm border-green-400 bg-green-100"/> Answered</div>
                                    <div className="flex items-center gap-2"><div className="h-4 w-4 rounded-sm border-yellow-400 bg-yellow-100"/> Flagged</div>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                    <h2 className="text-lg font-semibold truncate hidden sm:block">{quiz.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                     <Button variant="outline" onClick={handleToggleFlag}>
                        <Flag className={cn("h-4 w-4", flagged[currentQuestion.id] && "text-yellow-500 fill-yellow-400")} />
                        <span className="ml-2 hidden md:inline">Flag for Review</span>
                    </Button>
                    <Button onClick={() => handleSubmit()} disabled={submitting} variant="destructive">
                        {submitting ? "Submitting..." : "Submit Quiz"}
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">
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
            </main>

            {/* Footer */}
            <footer className="flex h-16 shrink-0 items-center justify-between border-t bg-white px-4">
                 <Button variant="outline" onClick={() => handleNavigation(currentIndex - 1)} disabled={currentIndex === 0}>
                    <ChevronLeft className="h-4 w-4 mr-1"/>
                    Previous
                </Button>
                <div className="text-sm font-medium">
                    Question {currentIndex + 1} of {questions.length}
                </div>
                <Button onClick={() => handleNavigation(currentIndex + 1)} disabled={currentIndex === questions.length - 1}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1"/>
                </Button>
            </footer>
        </div>
    );
}
