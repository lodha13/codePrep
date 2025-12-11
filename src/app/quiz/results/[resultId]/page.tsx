import { notFound } from 'next/navigation';
import { getQuizById, getTestResultById } from '@/app/actions';
import Header from '@/components/layout/Header';
import { ResultDisplay } from '@/components/quiz/ResultDisplay';

export default async function ResultPage({ params }: { params: { resultId: string } }) {
  const result = await getTestResultById(params.resultId);

  if (!result) {
    notFound();
  }

  const quiz = await getQuizById(result.quizId);

  if (!quiz) {
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
