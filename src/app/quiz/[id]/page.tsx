
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, getDocs, collection, query, where, documentId, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Quiz, Question, QuizResult } from "@/types/schema";
import QuizRunner from "@/components/quiz/QuizRunner";
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
    const [alreadyCompleted, setAlreadyCompleted] = useState(false);

    useEffect(() => {
        const findOrCreateSession = async () => {
            if (!quizId || !user) return;

            setLoading(true);

            // 1. Check if the user has already COMPLETED this quiz
            const completedQuery = query(
                collection(db, "results"),
                where("userId", "==", user.uid),
                where("quizId", "==", quizId as string),
                where("status", "==", "completed")
            );
            const completedSnap = await getDocs(completedQuery);
            if (!completedSnap.empty) {
                setAlreadyCompleted(true);
                setLoading(false);
                return;
            }

            // 2. Check for an IN-PROGRESS session
            const inProgressQuery = query(
                collection(db, "results"),
                where("userId", "==", user.uid),
                where("quizId", "==", quizId as string),
                where("status", "==", "in-progress")
            );
            const sessionSnap = await getDocs(inProgressQuery);

            let session: QuizResult;
            let currentQuiz: Quiz;

            if (sessionSnap.empty) {
                // 3. If no session, fetch quiz data to create a new one
                const quizRef = doc(db, "quizzes", quizId as string);
                const quizSnap = await getDoc(quizRef);

                if (!quizSnap.exists()) {
                    setLoading(false);
                    return; // Quiz not found
                }
                currentQuiz = { id: quizSnap.id, ...quizSnap.data() } as Quiz;
                setQuiz(currentQuiz);

                // Create a new session document
                const newSessionData: Omit<QuizResult, 'id'> = {
                    quizId: currentQuiz.id,
                    quizTitle: currentQuiz.title,
                    userId: user.uid,
                    startedAt: Timestamp.now(),
                    status: 'in-progress',
                    score: 0,
                    totalScore: 0,
                    answers: {},
                };
                const sessionRef = await addDoc(collection(db, "results"), newSessionData);
                session = { id: sessionRef.id, ...newSessionData };
            } else {
                // 4. If session exists, use it
                const sessionDoc = sessionSnap.docs[0];
                session = { id: sessionDoc.id, ...sessionDoc.data() } as QuizResult;

                // Also fetch quiz data if not already fetched
                const quizRef = doc(db, "quizzes", quizId as string);
                const quizSnap = await getDoc(quizRef);
                if (quizSnap.exists()) {
                    currentQuiz = { id: quizSnap.id, ...quizSnap.data() } as Quiz;
                    setQuiz(currentQuiz);
                } else {
                    // This case should ideally not happen if a session exists
                    setLoading(false);
                    return;
                }
            }

            setQuizSession(session);

            // 5. Fetch questions for the quiz
            if (session && currentQuiz?.questionIds?.length) {
                const qQuery = query(collection(db, "questions"), where(documentId(), "in", currentQuiz.questionIds));
                const qSnap = await getDocs(qQuery);
                const qList = qSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));

                const orderedQuestions = currentQuiz.questionIds.map(qid => qList.find(q => q.id === qid)).filter(Boolean) as Question[];
                setQuestions(orderedQuestions);
            }

            setLoading(false);
        };

        if (!authLoading && user) {
            findOrCreateSession();
        }
    }, [quizId, user, authLoading]);


    if (loading || authLoading) return <div className="p-8 text-center">Loading Quiz...</div>;

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

    if (!quiz || !quizSession) return <div className="p-8 text-center">Quiz not found or you do not have access.</div>;

    return <QuizRunner quiz={quiz} questions={questions} session={quizSession} />;
}
