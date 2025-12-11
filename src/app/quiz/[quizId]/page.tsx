'use client';

import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import { QuizRunner } from '@/components/quiz/QuizRunner';
import { useFirebase } from '@/firebase';
import type { Quiz } from '@/lib/types';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function QuizPage({ params }: { params: { quizId: string } }) {
  const { firestore } = useFirebase();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuiz() {
      if (!firestore) return;
      setLoading(true);

      try {
        const quizDocRef = doc(firestore, 'quizzes', params.quizId);
        const quizDoc = await getDoc(quizDocRef);

        if (!quizDoc.exists()) {
          setQuiz(null);
          return;
        }

        const quizData = { id: quizDoc.id, ...quizDoc.data() } as Quiz;
        
        const questionsCollection = collection(firestore, `quizzes/${params.quizId}/questions`);
        const questionSnapshot = await getDocs(questionsCollection);
        quizData.questions = questionSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

        setQuiz(quizData);
      } catch (error) {
        console.error("Error fetching quiz:", error);
        setQuiz(null);
      } finally {
        setLoading(false);
      }
    }

    fetchQuiz();
  }, [firestore, params.quizId]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="container mx-auto flex flex-1 items-center justify-center px-4 py-8 md:px-6 md:py-12">
          <Loader2 className="h-12 w-12 animate-spin" />
        </main>
      </>
    );
  }

  if (!quiz) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="container mx-auto flex-1 px-4 py-8 md:px-6 md:py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">{quiz.title}</h1>
            <p className="mt-4 text-lg text-muted-foreground">{quiz.description}</p>
          </div>
          <QuizRunner quiz={quiz} />
        </div>
      </main>
    </>
  );
}
