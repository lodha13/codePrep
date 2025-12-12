"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, getDocs, query, where, documentId } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { QuizResult, Question, Quiz } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface HydratedAnswer extends QuizResult['answers'][string] {
    questionTitle?: string;
}

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

    const percentage = Math.round((result.score / result.totalScore) * 100);

    const hydratedAnswers: HydratedAnswer[] = Object.values(result.answers).map(ans => ({
        ...ans,
        questionTitle: questions[ans.questionId]?.title || 'Unknown Question'
    }));

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
             <header className="mb-8">
                <p className="text-sm text-muted-foreground">Result for</p>
                <h1 className="text-4xl font-bold font-headline mt-1">{quiz?.title || 'Quiz'}</h1>
            </header>
            <Card className="text-center py-10 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-6xl font-bold font-headline">{percentage}%</CardTitle>
                    <CardDescription className="text-lg">You scored {result.score} out of {result.totalScore}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/candidate">Back to Dashboard</Link>
                    </Button>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h2 className="text-2xl font-bold font-headline">Detailed Breakdown</h2>
                {hydratedAnswers.map((ans, idx) => (
                    <Card key={idx} className="flex justify-between items-center p-4">
                        <div className="flex items-center gap-4">
                            {ans.status === 'correct' ? 
                                <CheckCircle className="text-green-500 h-6 w-6 flex-shrink-0" /> : 
                                <XCircle className="text-red-500 h-6 w-6 flex-shrink-0" />
                            }
                            <div>
                                <p className="font-semibold">{ans.questionTitle}</p>
                                <p className="text-xs text-muted-foreground mt-1">Your answer: <span className="font-mono bg-gray-100 p-1 rounded text-xs">{ans.userAnswer || "No Answer"}</span></p>
                            </div>
                        </div>
                        <div className="font-bold text-lg">
                            {ans.score} pts
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
