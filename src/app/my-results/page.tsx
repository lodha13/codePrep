'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { TestResult, Quiz } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function MyResultsPage() {
    const { firestore } = useFirebase();
    const { user, isUserLoading } = useUser();
    const [results, setResults] = useState<(TestResult & { quizTitle?: string })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchResults() {
            if (!firestore || !user) {
                if(!isUserLoading) setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const resultsQuery = query(collection(firestore, 'testResults'), where('userId', '==', user.uid));
                const resultsSnapshot = await getDocs(resultsQuery);
                const resultsList = resultsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestResult));

                const quizIds = [...new Set(resultsList.map(r => r.quizId))];
                if (quizIds.length > 0) {
                    const quizzesQuery = query(collection(firestore, 'quizzes'), where('__name__', 'in', quizIds));
                    const quizzesSnapshot = await getDocs(quizzesQuery);
                    const quizzesMap = new Map<string, Quiz>();
                    quizzesSnapshot.docs.forEach(doc => {
                        quizzesMap.set(doc.id, { id: doc.id, ...doc.data() } as Quiz);
                    });
                    
                    const resultsWithQuizTitles = resultsList.map(result => ({
                        ...result,
                        quizTitle: quizzesMap.get(result.quizId)?.title || 'Unknown Quiz',
                    }));
                    setResults(resultsWithQuizTitles);
                } else {
                    setResults([]);
                }

            } catch (error) {
                console.error("Error fetching results:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchResults();
    }, [firestore, user, isUserLoading]);

    return (
        <>
            <Header />
            <main className="container mx-auto flex-1 px-4 py-8 md:px-6 md:py-12">
                <div className="mx-auto max-w-4xl">
                    <div className="mb-8">
                        <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">My Scores</h1>
                        <p className="mt-4 text-lg text-muted-foreground">Here are the results of the quizzes you've completed.</p>
                    </div>

                    {loading || isUserLoading ? (
                        <div className="flex justify-center">
                            <Loader2 className="h-12 w-12 animate-spin" />
                        </div>
                    ) : !user ? (
                         <Card className="text-center">
                            <CardHeader>
                                <CardTitle>Please Log In</CardTitle>
                                <CardDescription>You need to be logged in to view your scores.</CardDescription>
                            </CardHeader>
                        </Card>
                    ) : results.length === 0 ? (
                        <Card className="text-center">
                           <CardHeader>
                               <CardTitle>No Results Found</CardTitle>
                               <CardDescription>You haven't completed any quizzes yet. Take a quiz to see your results here!</CardDescription>
                           </CardHeader>
                           <CardFooter className="justify-center">
                               <Button asChild>
                                   <Link href="/">View Quizzes</Link>
                               </Button>
                           </CardFooter>
                       </Card>
                    ) : (
                        <div className="space-y-4">
                            {results.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()).map(result => (
                                <Card key={result.id}>
                                    <CardHeader>
                                        <CardTitle>{result.quizTitle}</CardTitle>
                                        <CardDescription>
                                            Submitted on {new Date(result.submittedAt).toLocaleString()}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl font-bold">Score: {result.score}</p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button asChild variant="outline">
                                            <Link href={`/quiz/results/${result.id}`}>View Detailed Report</Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
