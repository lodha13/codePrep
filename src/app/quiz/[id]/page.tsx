
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, getDocs, collection, query, where, documentId, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Quiz, Question } from "@/types/schema";
import QuizRunner from "@/components/quiz/QuizRunner";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function QuizPage() {
    const { id } = useParams(); // quiz id
    const { user, loading: authLoading } = useAuth();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [alreadyAttempted, setAlreadyAttempted] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!id || !user || authLoading) return;

            // More reliable check: Query the results collection to see if this user has
            // already submitted a result for this quiz.
            const resultsQuery = query(
                collection(db, "results"), 
                where("userId", "==", user.uid), 
                where("quizId", "==", id as string),
                limit(1) // We only need to know if at least one exists
            );
            const resultsSnapshot = await getDocs(resultsQuery);

            if (!resultsSnapshot.empty) {
                setAlreadyAttempted(true);
                setLoading(false);
                return;
            }

            const quizRef = doc(db, "quizzes", id as string);
            const quizSnap = await getDoc(quizRef);

            if (quizSnap.exists()) {
                const quizData = { id: quizSnap.id, ...quizSnap.data() } as Quiz;
                setQuiz(quizData);

                if (quizData.questionIds && quizData.questionIds.length > 0) {
                    const qQuery = query(collection(db, "questions"), where(documentId(), "in", quizData.questionIds));
                    const qSnap = await getDocs(qQuery);
                    const qList = qSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));

                    const orderedQuestions = quizData.questionIds.map(qid => qList.find(q => q.id === qid)).filter(Boolean) as Question[];

                    setQuestions(orderedQuestions);
                }
            }
            setLoading(false);
        };

        if (user) {
          fetchData();
        }
    }, [id, user, authLoading]);

    if (loading || authLoading) return <div className="p-8 text-center">Loading Quiz...</div>;
    
    if (alreadyAttempted) {
        return (
             <div className="flex h-screen w-screen items-center justify-center bg-background">
                <Card className="max-w-lg text-center p-8">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Quiz Already Attempted</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p>You have already completed this quiz and cannot attempt it again.</p>
                        <p className="text-sm text-muted-foreground">If you believe this is an error, please contact an administrator.</p>
                        <Button asChild className="mt-4">
                            <Link href="/candidate">Back to Dashboard</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!quiz) return <div className="p-8 text-center">Quiz not found or you do not have access.</div>;

    return <QuizRunner quiz={quiz} questions={questions} />;
}
