
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, getDocs, query, where, documentId } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { QuizResult, Question, Quiz, QuestionResult, CodingQuestion, TestCaseResult, MCQQuestion } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle, XCircle, ChevronRight, AlertCircle, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const formatTimeTaken = (totalSeconds: number | undefined) => {
    if (totalSeconds === undefined) return 'N/A';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
};

export default function ResultPage() {
    const { id } = useParams(); // resultId
    const { user } = useAuth();
    const [result, setResult] = useState<QuizResult | null>(null);
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [questions, setQuestions] = useState<Record<string, Question>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResult = async () => {
            if (!id || !user) return;
            setLoading(true);

            const resultRef = doc(db, "results", id as string);
            const resultSnap = await getDoc(resultRef);

            if (!resultSnap.exists() || resultSnap.data().userId !== user.uid) {
                setLoading(false);
                return; // Or show unauthorized
            }

            const resultData = { id: resultSnap.id, ...resultSnap.data() } as QuizResult;
            setResult(resultData);

            // Fetch quiz details
            const quizRef = doc(db, "quizzes", resultData.quizId);
            const quizSnap = await getDoc(quizRef);
            if (quizSnap.exists()) {
                setQuiz({ id: quizSnap.id, ...quizSnap.data() } as Quiz);
            }

            // Fetch question details
            const questionIds = Object.keys(resultData.answers);
            if (questionIds.length > 0) {
                const qQuery = query(collection(db, "questions"), where(documentId(), "in", questionIds));
                const qSnap = await getDocs(qQuery);
                const qData = qSnap.docs.reduce((acc, doc) => {
                    acc[doc.id] = { id: doc.id, ...doc.data() } as Question;
                    return acc;
                }, {} as Record<string, Question>);
                setQuestions(qData);
            }

            setLoading(false);
        };
        fetchResult();
    }, [id, user]);

    if (loading) return <div className="p-8 text-center">Loading Result...</div>;
    if (!result) return <div className="p-8 text-center">Result not found or you don't have permission to view it.</div>;

    const percentage = result.totalScore > 0 ? Math.round((result.score / result.totalScore) * 100) : 0;
    
    const getStatusIcon = (status: QuestionResult['status']) => {
        switch (status) {
            case 'correct':
                return <CheckCircle className="text-green-500 h-6 w-6 flex-shrink-0" />;
            case 'incorrect':
            case 'unanswered':
                return <XCircle className="text-red-500 h-6 w-6 flex-shrink-0" />;
            case 'partial':
                return <AlertCircle className="text-yellow-500 h-6 w-6 flex-shrink-0" />;
            default:
                return null;
        }
    }

    const renderMCQResult = (answer: QuestionResult, question: MCQQuestion) => {
        const userAnswerIndex = answer.userAnswer ? parseInt(answer.userAnswer, 10) : -1;
        const correctIndex = question.correctOptionIndex;

        return (
            <div className="mt-4 space-y-2">
                 <h4 className="text-sm font-semibold text-muted-foreground">Options:</h4>
                 <div className="space-y-3">
                    {question.options.map((option, index) => {
                        const isCorrect = index === correctIndex;
                        const isUserAnswer = index === userAnswerIndex;

                        return (
                            <div key={index} className={cn(
                                "p-3 rounded-md border text-sm flex items-start gap-3",
                                isCorrect && "bg-green-100/60 border-green-300 text-green-900",
                                isUserAnswer && !isCorrect && "bg-red-100/60 border-red-300 text-red-900"
                            )}>
                                {isCorrect ? (
                                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                ) : (isUserAnswer && !isCorrect) ? (
                                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                ) : (
                                    <div className="h-5 w-5 flex-shrink-0" /> // Placeholder for alignment
                                )}
                               <span>{option}</span>
                            </div>
                        )
                    })}
                 </div>
            </div>
        )
    };
    
    const renderCodingResult = (answer: QuestionResult, question: CodingQuestion) => (
        <div className="mt-4 space-y-3">
            <div>
                <h4 className="text-sm font-semibold text-muted-foreground">Your Submitted Code:</h4>
                <pre className="mt-1 font-mono bg-gray-100 p-3 rounded text-xs whitespace-pre-wrap w-full overflow-x-auto">
                    <code>{answer.userAnswer || "No Answer Submitted"}</code>
                </pre>
            </div>
            
             {answer.testCaseResults && (
                <div>
                    <h4 className="text-sm font-semibold text-muted-foreground">Test Case Breakdown:</h4>
                    <div className="mt-2 space-y-3">
                        {answer.testCaseResults.map((tc, index) => (
                            <Card key={index} className="bg-secondary/50 p-3 text-xs">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {tc.passed ? <CheckCircle className="h-4 w-4 text-green-500"/> : <XCircle className="h-4 w-4 text-red-500"/>}
                                        <span className="font-semibold">Test Case {index + 1} {tc.passed ? "" : " - Failed"}</span>
                                    </div>
                                    <Badge variant={tc.passed ? 'default' : 'destructive'}>
                                        {tc.passed ? 'Passed' : 'Failed'}
                                    </Badge>
                                </div>
                                <div className="font-mono bg-background p-2 rounded-md space-y-1">
                                    <p><span className="font-semibold">Input:</span> {tc.input}</p>
                                    <p><span className="font-semibold">Expected:</span> {tc.expected}</p>
                                    <p><span className="font-semibold">Got:</span> {tc.actual}</p>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
             )}
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
             <header className="mb-8">
                 <div className="flex items-center text-sm text-muted-foreground">
                    <Link href="/candidate/profile" className="hover:underline">My Profile</Link>
                    <ChevronRight className="h-4 w-4 mx-1" />
                    <span>Result</span>
                 </div>
                <h1 className="text-4xl font-bold font-headline mt-1">{quiz?.title || 'Quiz'}</h1>
            </header>
            <Card className="shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-6xl font-bold font-headline">{percentage}%</CardTitle>
                    <CardDescription className="text-lg">You scored {result.score} out of {result.totalScore}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                     <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>Time Taken: {formatTimeTaken(result.timeTakenSeconds)}</span>
                    </div>
                    <Button asChild>
                        <Link href="/candidate">Back to Dashboard</Link>
                    </Button>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h2 className="text-2xl font-bold font-headline">Detailed Breakdown</h2>
                {Object.entries(result.answers).map(([questionId, ans]) => {
                    const question = questions[questionId];
                    if (!question) return (
                        <Card key={questionId} className="p-4">
                            <p>Could not load details for question ID: {questionId}</p>
                        </Card>
                    );

                    return (
                        <Card key={questionId} className="p-4">
                            <div className="flex justify-between items-start">
                                    <div className="flex items-start gap-4">
                                    {getStatusIcon(ans.status)}
                                    <div className="prose prose-sm max-w-none">
                                        <p className="font-semibold mb-2">{question.title}</p>
                                        <div dangerouslySetInnerHTML={{ __html: question.description }} />
                                    </div>
                                </div>
                                <div className="font-bold text-lg text-right flex-shrink-0 ml-4">
                                    {ans.score} / {ans.total} pts
                                </div>
                            </div>
                            <div className="mt-2 pl-10">
                                {question.type === 'mcq' && renderMCQResult(ans, question as MCQQuestion)}
                                {question.type === 'coding' && renderCodingResult(ans, question as CodingQuestion)}
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
