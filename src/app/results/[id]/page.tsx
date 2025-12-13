
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, getDocs, query, where, documentId } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { QuizResult, Question, Quiz, QuestionResult, CodingQuestion, TestCaseResult } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle, XCircle, ChevronRight, AlertCircle, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";

type HydratedAnswer = QuestionResult & {
    questionTitle?: string;
    questionType?: 'mcq' | 'coding';
};

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
                    acc[doc.id] = doc.data() as Question;
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

    const hydratedAnswers: HydratedAnswer[] = Object.values(result.answers).map(ans => ({
        ...ans,
        questionTitle: questions[ans.questionId]?.title || 'Unknown Question',
        questionType: questions[ans.questionId]?.type
    }));
    
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
    
    const renderTestCaseResults = (testCaseResults: TestCaseResult[]) => (
        <div className="mt-4 space-y-3">
             <h4 className="text-sm font-semibold text-muted-foreground">Test Case Breakdown:</h4>
            {testCaseResults.map((tc, index) => (
                <Card key={index} className="bg-secondary/50 p-3 text-xs">
                    <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-2">
                             {tc.passed ? <CheckCircle className="h-4 w-4 text-green-500"/> : <XCircle className="h-4 w-4 text-red-500"/>}
                            <span className="font-semibold">Test Case {index + 1}</span>
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
                {hydratedAnswers.map((ans, idx) => (
                    <Card key={idx} className="p-4">
                       <div className="flex justify-between items-start">
                             <div className="flex items-start gap-4">
                                {getStatusIcon(ans.status)}
                                <div>
                                    <p className="font-semibold">{ans.questionTitle}</p>
                                </div>
                            </div>
                            <div className="font-bold text-lg text-right">
                                {ans.score} / {ans.total} pts
                            </div>
                       </div>
                        <div className="mt-4 pl-10">
                            <p className="text-xs text-muted-foreground">Your answer:</p>
                             {ans.questionType === 'coding' ? (
                                <pre className="mt-1 font-mono bg-gray-100 p-3 rounded text-xs whitespace-pre-wrap w-full overflow-x-auto"><code>{ans.userAnswer || "No Answer"}</code></pre>
                             ) : (
                                <p className="font-mono bg-gray-100 p-2 rounded text-sm inline-block mt-1">{ans.userAnswer || "No Answer"}</p>
                             )}
                             
                             {ans.questionType === 'coding' && ans.testCaseResults && renderTestCaseResults(ans.testCaseResults)}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
