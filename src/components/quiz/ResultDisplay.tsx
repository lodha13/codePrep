'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle, Home, RefreshCw, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { MultipleChoiceQuestion, Quiz, TestResult } from '@/lib/types';
import { Separator } from '../ui/separator';

interface ResultDisplayProps {
  quiz: Quiz;
  result: TestResult;
}

export function ResultDisplay({ quiz, result }: ResultDisplayProps) {
    
  const { score, totalMarks } = React.useMemo(() => {
    const totalMarks = quiz.questions.reduce((sum, q) => sum + q.mark, 0);
    return { score: result.score, totalMarks };
  }, [quiz, result]);

  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="font-headline text-3xl">Quiz Results: {quiz.title}</CardTitle>
        <CardDescription>Completed on {new Date(result.submittedAt).toLocaleString()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="flex flex-col items-center space-y-4">
            <h3 className="text-xl font-semibold">Your Score</h3>
            <div className={`flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br ${percentage > 70 ? 'from-green-400 to-emerald-500' : 'from-amber-400 to-orange-500'} text-white shadow-lg`}>
                <span className="text-4xl font-bold">{percentage}%</span>
            </div>
            <p className="text-lg text-muted-foreground">{score} out of {totalMarks} marks</p>
        </div>
        
        <Separator />

        <div>
            <h3 className="mb-4 text-xl font-semibold text-center">Answer Breakdown</h3>
            <div className="space-y-6">
                {quiz.questions.map((question, index) => {
                    const questionResult = result.questionResults.find(qr => qr.questionId === question.id);
                    if (!questionResult) return null;

                    const { isCorrect, userAnswer } = questionResult;

                    return (
                        <Card key={question.id} className={`${isCorrect === true ? 'border-green-500' : isCorrect === false ? 'border-destructive' : ''}`}>
                            <CardHeader>
                                <CardTitle className="flex items-start justify-between text-lg">
                                    <span className='flex-1'>Question {index + 1}: {question.question} ({question.mark} marks)</span>
                                    {isCorrect === true && <CheckCircle className="h-6 w-6 text-green-500 ml-4" />}
                                    {isCorrect === false && <XCircle className="h-6 w-6 text-destructive ml-4" />}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p className="text-sm">Your answer: <span className="font-mono rounded bg-muted px-2 py-1 text-sm">{userAnswer}</span></p>
                                {question.type === 'multiple-choice' && !isCorrect && (
                                    <p className="text-sm">Correct answer: <span className="font-mono rounded bg-green-100 dark:bg-green-900/50 px-2 py-1 text-sm">{question.answer}</span></p>
                                )}
                                {question.type === 'coding' && (
                                    <div>
                                        <p className="text-sm">Your code submission:</p>
                                        <pre className="mt-2 w-full overflow-auto rounded-md bg-muted p-4 font-code text-xs">
                                            <code>{userAnswer}</code>
                                        </pre>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {isCorrect ? "This submission passed the automated checks." : "This submission did not pass all automated checks."}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild variant="outline">
            <Link href={`/quiz/${quiz.id}`}><RefreshCw className="mr-2" /> Try Again</Link>
          </Button>
          <Button asChild>
            <Link href="/"><Home className="mr-2" /> Back to Quizzes</Link>
          </Button>
      </CardFooter>
    </Card>
  );
}
