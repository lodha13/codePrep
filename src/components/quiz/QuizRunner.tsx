'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

import { submitQuiz } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import type { Quiz, UserAnswer } from '@/lib/types';
import { CodingQuestion } from './CodingQuestion';
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion';

interface QuizRunnerProps {
  quiz: Quiz;
}

export function QuizRunner({ quiz }: QuizRunnerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<UserAnswer[]>([]);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  const handleAnswerChange = (answer: string) => {
    setAnswers((prev) => {
      const existingAnswerIndex = prev.findIndex((a) => a.questionId === currentQuestion.id);
      if (existingAnswerIndex !== -1) {
        const newAnswers = [...prev];
        newAnswers[existingAnswerIndex] = { questionId: currentQuestion.id, answer };
        return newAnswers;
      }
      return [...prev, { questionId: currentQuestion.id, answer }];
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = () => {
    if(answers.length !== quiz.questions.length) {
      toast({
        title: "Incomplete Quiz",
        description: "Please answer all questions before submitting.",
        variant: "destructive",
      });
      return;
    }
    startTransition(async () => {
      await submitQuiz(quiz.id, answers);
    });
  };

  const currentAnswer = answers.find(a => a.questionId === currentQuestion.id)?.answer || '';

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Question {currentQuestionIndex + 1} of {quiz.questions.length}</p>
        </div>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent>
        {currentQuestion.type === 'multiple-choice' ? (
          <MultipleChoiceQuestion question={currentQuestion} onAnswerChange={handleAnswerChange} selectedAnswer={currentAnswer} />
        ) : (
          <CodingQuestion question={currentQuestion} onAnswerChange={handleAnswerChange} codeAnswer={currentAnswer} />
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handlePrev} disabled={currentQuestionIndex === 0}>
          <ArrowLeft className="mr-2" /> Previous
        </Button>
        {currentQuestionIndex === quiz.questions.length - 1 ? (
          <Button variant="accent" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Submitting...' : 'Submit Quiz'} <Check className="ml-2" />
          </Button>
        ) : (
          <Button onClick={handleNext}>
            Next <ArrowRight className="ml-2" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
