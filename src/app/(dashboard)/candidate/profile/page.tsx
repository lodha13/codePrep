
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { QuizResult } from '@/types/schema';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar } from 'lucide-react';

export default function ProfilePage() {
    const { user } = useAuth();
    const [results, setResults] = useState<QuizResult[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResults = async () => {
            if (!user) {
                setLoading(false);
                return;
            };

            setLoading(true);
            const resultsQuery = query(collection(db, 'results'), where('userId', '==', user.uid));
            const resultsSnap = await getDocs(resultsQuery);
            const userResults = resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizResult));

            // Sort results by completion date, most recent first
            userResults.sort((a, b) => {
                const dateA = (a.completedAt as any)?.toDate() || 0;
                const dateB = (b.completedAt as any)?.toDate() || 0;
                return dateB - dateA;
            });

            setResults(userResults);
            setLoading(false);
        };

        fetchResults();
    }, [user]);

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-12">
            <div className="mb-8">
                <h1 className="text-4xl font-bold font-headline">My Profile</h1>
                <p className="text-muted-foreground mt-1">A history of your quiz attempts and performance.</p>
            </div>

            {loading ? (
                <div className="space-y-4">
                    <Card className="h-28 animate-pulse"></Card>
                    <Card className="h-28 animate-pulse"></Card>
                </div>
            ) : results.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-lg">
                    <h3 className="text-2xl font-bold">No History Found</h3>
                    <p className="text-muted-foreground mt-2">You haven't completed any quizzes yet.</p>
                    <Button asChild className="mt-4">
                        <Link href="/candidate">Start a Quiz</Link>
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {results.map(result => (
                        <Card key={result.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="flex items-center justify-between p-6">
                                <div>
                                    <h3 className="text-lg font-semibold">{result.quizTitle}</h3>
                                    <div className="flex items-center text-sm text-muted-foreground mt-2 gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <Trophy className="h-4 w-4 text-yellow-500" />
                                            <span>Scored {result.score} / {result.totalScore}</span>
                                        </div>
                                         <div className="flex items-center gap-1.5">
                                            <Calendar className="h-4 w-4" />
                                            <span>Completed on {(result.completedAt as any)?.toDate().toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <Button asChild variant="outline">
                                    <Link href={`/results/${result.id}`}>View Details</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
