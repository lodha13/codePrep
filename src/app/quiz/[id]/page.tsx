
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, getDocs, collection, query, where, documentId } from "firebase/firestore";
import { db, getOrCreateQuizSession } from "@/lib/firebase";
import { Quiz, Question, QuizResult } from "@/types/schema";
import QuizRunner from "@/components/quiz/QuizRunner";
import QuizInstructions from "@/components/quiz/QuizInstructions";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function QuizPage() {
    const { id: quizId } = useParams();
    const { user, loading: authLoading } = useAuth();
    
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [quizSession, setQuizSession] = useState<QuizResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [alreadyCompleted, setAlreadyCompleted] = useState(false);
    const [quizStarted, setQuizStarted] = useState(false);

    useEffect(() => {
        const prepareQuiz = async () => {
            if (!quizId || !user) return;
            setLoading(true);
            setError(null);

            // 1. Authoritative client-side check for completion from context
            if (user.completedQuizIds?.includes(quizId as string)) {
                setAlreadyCompleted(true);
                setLoading(false);
                return;
            }

            try {
                // 2. Fetch quiz data
                const quizRef = doc(db, "quizzes", quizId as string);
                const quizSnap = await getDoc(quizRef);

                if (!quizSnap.exists()) {
                    setError("Quiz not found.");
                    setLoading(false);
                    return;
                }
                const currentQuiz = { id: quizSnap.id, ...quizSnap.data() } as Quiz;
                setQuiz(currentQuiz);

                // 3. Get or create session
                const session = await getOrCreateQuizSession(user.uid, quizId as string, currentQuiz.title) as QuizResult;
                setQuizSession(session);

                // 4. Fetch questions for the quiz
                if (session && currentQuiz?.questionIds?.length) {
                    const qQuery = query(collection(db, "questions"), where(documentId(), "in", currentQuiz.questionIds));
                    const qSnap = await getDocs(qQuery);
                    const qList = qSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
                    const orderedQuestions = currentQuiz.questionIds.map(qid => qList.find(q => q.id === qid)).filter(Boolean) as Question[];
                    setQuestions(orderedQuestions);
                }
            } catch (e: any) {
                console.error("Error preparing quiz:", e);
                setError("Failed to load quiz. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading && user) {
            prepareQuiz();
        }
    }, [quizId, user, authLoading]);

    const handleStartQuiz = () => {
        setQuizStarted(true);
    };

    if (loading || authLoading) return <div className="p-8 text-center">Loading Quiz...</div>;
    
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    if (alreadyCompleted) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background">
                <Card className="max-w-lg text-center p-8">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Quiz Already Completed</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p>You have already completed this quiz. You can view your results on your profile page.</p>
                        <div className="flex justify-center gap-4">
                            <Button asChild className="mt-4">
                                <Link href="/candidate/profile">View Results</Link>
                            </Button>
                             <Button asChild variant="outline" className="mt-4">
                                <Link href="/candidate">Back to Dashboard</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (!quiz || !quizSession || !user) return <div className="p-8 text-center">Could not load quiz data.</div>;

    if (!quizStarted) {
        return <QuizInstructions quiz={quiz} user={user} onStart={handleStartQuiz} />;
    }

    return <QuizRunner mode="internal" quiz={quiz} questions={questions} session={quizSession} user={user} />;
}
