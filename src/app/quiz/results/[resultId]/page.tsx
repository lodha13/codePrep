'use client';

import { notFound, useParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import { ResultDisplay } from '@/components/quiz/ResultDisplay';
import { useDoc } from '@/firebase';
import type { Quiz, TestResult } from '@/lib/types';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import React from 'react';
import { useFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';

export default function ResultPage() {
  const params = useParams();
  const resultId = params.resultId as string;
  const { firestore } = useFirebase();

  const [quiz, setQuiz] = React.useState<Quiz | null>(null);
  const [loadingQuiz, setLoadingQuiz] = React.useState(true);

  const resultRef = React.useMemo(() => {
    if (!firestore || !resultId) return null;
    return doc(firestore, 'testResults', resultId);
  }, [firestore, resultId]);
  
  const { data: result, isLoading: loadingResult } = useDoc<TestResult>(resultRef);

  React.useEffect(() => {
    if (!result || !firestore) return;

    async function fetchQuizAndQuestions() {
      setLoadingQuiz(true);
      try {
        const quizDocRef = doc(firestore, 'quizzes', result.quizId);
        const quizDoc = await getDoc(quizDocRef);

        if (!quizDoc.exists()) {
          setQuiz(null);
          return;
        }

        const quizData = { id: quizDoc.id, ...quizDoc.data() } as Quiz;
        
        const questionsCollection = collection(firestore, `quizzes/${result.quizId}/questions`);
        const questionSnapshot = await getDocs(questionsCollection);
        quizData.questions = questionSnapshot.docs.map(qDoc => ({ id: qDoc.id, ...qDoc.data() } as any));

        const questionResultsCollection = collection(firestore, `testResults/${result.id}/questionResults`);
        const questionResultsSnapshot = await getDocs(questionResultsCollection);
        result.questionResults = questionResultsSnapshot.docs.map(qrDoc => ({ id: qrDoc.id, ...qrDoc.data() } as any));
        
        setQuiz(quizData);
      } catch (error) {
        console.error("Error fetching quiz for results:", error);
        setQuiz(null);
      } finally {
        setLoadingQuiz(false);
      }
    }

    fetchQuizAndQuestions();

  }, [result, firestore]);

  const isLoading = loadingResult || loadingQuiz;

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="container mx-auto flex flex-1 items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin" />
        </main>
      </>
    );
  }

  if (!result) {
    notFound();
  }

  if (!quiz) {
    // Or show a specific error that the quiz for this result couldn't be loaded
    notFound();
  }

  return (
    <>
      <Header />
      <main className="container mx-auto flex-1 px-4 py-8 md:px-6 md:py-12">
        <div className="mx-auto max-w-4xl">
          <ResultDisplay quiz={quiz} result={result} />
        </div>
      </main>
    </>
  );
}
