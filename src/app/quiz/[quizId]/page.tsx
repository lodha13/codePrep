import { notFound } from 'next/navigation';
import { getQuizById } from '@/app/actions';
import Header from '@/components/layout/Header';
import { QuizRunner } from '@/components/quiz/QuizRunner';

export default async function QuizPage({ params }: { params: { quizId: string } }) {
  const quiz = await getQuizById(params.quizId);

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
