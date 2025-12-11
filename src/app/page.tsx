import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Code, Component, Database } from 'lucide-react';

import { getQuizzes } from '@/app/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { placeholderImages } from '@/lib/placeholder-images';
import Header from '@/components/layout/Header';

const ICONS: { [key: string]: React.ReactNode } = {
  'Data Structures': <Database className="h-6 w-6" />,
  'Frontend': <Component className="h-6 w-6" />,
  'Java': <Code className="h-6 w-6" />,
  'default': <Code className="h-6 w-6" />,
};

export default async function Home() {
  const quizzes = await getQuizzes();
  const heroImage = placeholderImages.find((img) => img.id === 'hero');

  return (
    <>
    <Header />
    <main className="flex-1">
      <section className="relative w-full py-20 md:py-32 lg:py-40">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            data-ai-hint={heroImage.imageHint}
            fill
            className="absolute inset-0 -z-10 h-full w-full object-cover brightness-50"
          />
        )}
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center text-primary-foreground">
            <h1 className="font-headline text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Welcome to CodePrep Pro
            </h1>
            <p className="mt-6 text-lg leading-8">
              The ultimate platform for software engineers to practice for coding interviews. Sharpen your skills with a variety of quizzes, from multiple-choice questions to hands-on coding challenges.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button asChild size="lg" variant="accent">
                <Link href="#quizzes">
                  Get Started <ArrowRight className="ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="quizzes" className="w-full bg-background py-20 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-12 text-center">
            <h2 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">Available Quizzes</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Choose a quiz to test your knowledge and prepare for your next interview.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="flex flex-col overflow-hidden transition-transform hover:scale-105 hover:shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="font-headline text-2xl">{quiz.title}</CardTitle>
                    <CardDescription>{quiz.questions.length} questions</CardDescription>
                  </div>
                  {ICONS[quiz.skill] || ICONS.default}
                </CardHeader>
                <CardContent className="flex-grow">
                  <p>{quiz.description}</p>
                </CardContent>
                <CardFooter className="flex flex-col items-start gap-4">
                  <Badge variant="secondary">{quiz.skill}</Badge>
                  <Button asChild className="w-full" variant="outline">
                    <Link href={`/quiz/${quiz.id}`}>Start Quiz <ArrowRight className="ml-2" /></Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
    </>
  );
}
