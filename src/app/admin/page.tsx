'use client';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { getQuizzes, getTestResults, seedDatabase } from "../actions";
import { ListChecks, GraduationCap, DatabaseZap, Loader2 } from "lucide-react";
import React, { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from "@/firebase";
import { collection, getCountFromServer } from "firebase/firestore";

export default function AdminDashboardPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [quizCount, setQuizCount] = useState(0);
    const [submissionCount, setSubmissionCount] = useState(0);
    const [loadingCounts, setLoadingCounts] = useState(true);

    useEffect(() => {
        async function fetchCounts() {
            if (!firestore) return;
            setLoadingCounts(true);
            try {
                const quizzesCol = collection(firestore, 'quizzes');
                const quizSnapshot = await getCountFromServer(quizzesCol);
                setQuizCount(quizSnapshot.data().count);
                
                // Assuming testResults are also in a collection
                // const resultsCol = collection(firestore, 'testResults');
                // const resultsSnapshot = await getCountFromServer(resultsCol);
                // setSubmissionCount(resultsSnapshot.data().count);

            } catch (error) {
                console.error("Error fetching counts:", error);
            } finally {
                setLoadingCounts(false);
            }
        }
        fetchCounts();
    }, [firestore]);


    const handleSeed = () => {
        startTransition(async () => {
            const result = await seedDatabase();
            if (result.success) {
                toast({
                    title: "Database Seeded",
                    description: result.message,
                });
            } else {
                toast({
                    title: "Error",
                    description: result.message,
                    variant: "destructive",
                });
            }
        });
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h1 className="font-headline text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
                        <ListChecks className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loadingCounts ? <Loader2 className="h-6 w-6 animate-spin"/> : <div className="text-2xl font-bold">{quizCount}</div>}
                        <p className="text-xs text-muted-foreground">
                            Available quizzes for users
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loadingCounts ? <Loader2 className="h-6 w-6 animate-spin"/> : <div className="text-2xl font-bold">{submissionCount}</div>}
                        <p className="text-xs text-muted-foreground">
                            Total tests completed by users
                        </p>
                    </CardContent>
                </Card>
                <Card className="col-span-1 md:col-span-2 lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DatabaseZap className="h-5 w-5" />
                            Database Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Use this to populate your Firestore database with the initial set of quizzes from the mock data file. This is a one-time operation.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSeed} disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-2 h-4 w-4" />}
                            {isPending ? 'Seeding...' : 'Seed Database'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
            <div className="mt-8">
                <h2 className="text-2xl font-bold tracking-tight">Welcome, Admin!</h2>
                <p className="text-muted-foreground">
                    From this panel, you can manage quizzes, review user submissions, and oversee the platform.
                </p>
            </div>
        </div>
    );
}
