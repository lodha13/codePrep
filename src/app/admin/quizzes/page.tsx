'use client';

import React, { useEffect, useState } from 'react';
import { QuizManager } from "@/components/admin/QuizManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFirebase } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import type { Quiz } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function AdminQuizzesPage() {
    const { firestore } = useFirebase();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      async function fetchQuizzes() {
        if (!firestore) return;
        setLoading(true);
        try {
          const quizzesCollection = collection(firestore, 'quizzes');
          const quizSnapshot = await getDocs(quizzesCollection);
          const quizzesList = quizSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));
  
          const questionPromises = quizzesList.map(async (quiz) => {
            const questionsCollection = collection(firestore, `quizzes/${quiz.id}/questions`);
            const questionSnapshot = await getDocs(questionsCollection);
            quiz.questions = questionSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            return quiz;
          });
  
          const populatedQuizzes = await Promise.all(questionPromises);
          setQuizzes(populatedQuizzes);
  
        } catch (error) {
          console.error("Error fetching quizzes:", error);
        } finally {
          setLoading(false);
        }
      }
      fetchQuizzes();
    }, [firestore]);

    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h1 className="font-headline text-3xl font-bold tracking-tight">Quiz Management</h1>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                <QuizManager />

                <Card>
                    <CardHeader>
                        <CardTitle>Existing Quizzes</CardTitle>
                        <CardDescription>A list of all quizzes currently in the system.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
                        ) : (
                            quizzes.map(quiz => (
                                <div key={quiz.id} className="rounded-lg border p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold">{quiz.title}</h3>
                                            <p className="text-sm text-muted-foreground">{quiz.description}</p>
                                        </div>
                                        <Badge variant="secondary">{quiz.skill}</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">{quiz.questions.length} questions</p>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
