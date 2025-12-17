
"use client";

import { useEffect, useState } from "react";
import { Quiz } from "@/types/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { CheckSquare, Square } from "lucide-react";
import { Label } from "@/components/ui/label";
import { getUserAssignedQuizzes } from "@/lib/admin-utils";

export default function CandidateDashboard() {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        const fetchQuizzes = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const assignedQuizzes = await getUserAssignedQuizzes(user.uid);
                const completedQuizIds = user.completedQuizIds || [];
                
                // Filter out completed quizzes
                const availableQuizzes = assignedQuizzes.filter(quiz => !completedQuizIds.includes(quiz.id));
                
                setQuizzes(availableQuizzes);
            } catch (error) {
                console.error('Error fetching quizzes:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchQuizzes();
        }
    }, [user]);


    return (
        <div className="p-4 md:p-8 lg:p-12">
             <div className="mb-8">
                <p className="text-sm text-muted-foreground">Dashboard</p>
                <h1 className="text-4xl font-bold font-headline mt-1">My Quizzes</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-9">
                    <div className="space-y-4">
                         {loading ? (
                            <>
                                <Card className="h-24 animate-pulse"></Card>
                                <Card className="h-24 animate-pulse"></Card>
                                <Card className="h-24 animate-pulse"></Card>
                            </>
                        ) : quizzes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center py-20 border-2 border-dashed rounded-lg">
                                <h3 className="text-2xl font-bold font-headline">No Quizzes Available</h3>
                                <p className="text-muted-foreground mt-2">You've completed all available quizzes. Please check back later!</p>
                            </div>
                        ) : (
                            quizzes.map(quiz => (
                                <Card key={quiz.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="flex items-center justify-between p-6">
                                        <div>
                                            <h3 className="text-lg font-semibold">{quiz.title}</h3>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                <span>{quiz.difficulty || 'Easy'}</span> • <span>Max Score: {quiz.totalMarks || quiz.questionIds.length * 10}</span>
                                            </p>
                                        </div>
                                        <Button asChild variant="outline">
                                            <Link href={`/quiz/${quiz.id}`}>Solve Challenge</Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <aside className="lg:col-span-3">
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-4">Status</h3>
                            <div className="space-y-3">
                                <div className="flex items-center">
                                    <CheckSquare className="h-4 w-4 text-muted-foreground mr-2" />
                                    <Label>Solved</Label>
                                </div>
                                <div className="flex items-center">
                                    <Square className="h-4 w-4 text-muted-foreground mr-2" />
                                    <Label>Unsolved</Label>
                                </div>
                            </div>
                        </div>
                         <div>
                            <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-4">Progress</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Available Quizzes</Label>
                                    <span className="text-sm font-medium">{quizzes.length}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Completed</Label>
                                    <span className="text-sm font-medium">{user?.completedQuizIds?.length || 0}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Success Rate</Label>
                                    <span className="text-sm font-medium">
                                        {user?.completedQuizIds?.length ? 
                                            Math.round((user.completedQuizIds.length / (user.completedQuizIds.length + quizzes.length)) * 100) : 0}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

        </div>
    );
}
