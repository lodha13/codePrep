"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Quiz } from "@/types/schema";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function CandidateDashboard() {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const { user, signOut } = useAuth();

    useEffect(() => {
        const fetchQuizzes = async () => {
            // Fetch public quizzes
            const q = query(collection(db, "quizzes"), where("isPublic", "==", true));
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Quiz));
            setQuizzes(list);
        };
        fetchQuizzes();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Welcome, {user?.displayName || "Candidate"}</h1>
                    <p className="text-gray-600">Available assessments for you.</p>
                </div>
                <Button variant="outline" onClick={() => signOut()}>Logout</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quizzes.map(quiz => (
                    <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle>{quiz.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-gray-500 space-y-1">
                                <p>{quiz.description}</p>
                                <p>Duration: {quiz.durationMinutes} mins</p>
                                <p>{quiz.questionIds?.length || 0} Questions</p>
                                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-2 uppercase">{quiz.difficulty || "Medium"}</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Link href={`/quiz/${quiz.id}`} className="w-full">
                                <Button className="w-full">Start Quiz</Button>
                            </Link>
                        </CardFooter>
                    </Card>
                ))}
                {quizzes.length === 0 && (
                    <p className="text-gray-500 col-span-full text-center py-10">No quizzes available at the moment.</p>
                )}
            </div>
        </div>
    );
}
