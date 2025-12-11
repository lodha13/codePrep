'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Quiz, TestResult } from '@/lib/types';
import { BrainCircuit, Mail, View, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { evaluateCodeAction } from '@/app/actions';

interface ResultsDashboardProps {
  results: TestResult[];
  quizzes: Quiz[];
}

export function ResultsDashboard({ results: initialResults, quizzes }: ResultsDashboardProps) {
    const { toast } = useToast();
    const [selectedCode, setSelectedCode] = React.useState<{ code: string; question: string } | null>(null);
    const [aiEvaluation, setAiEvaluation] = React.useState<{ feedback: string; score: number } | null>(null);
    const [isEvaluating, setIsEvaluating] = React.useState(false);


    const handleSendEmail = (userId: string) => {
        // In a real app, this would trigger a backend service to send an email.
        toast({
            title: "Email Sent (Simulation)",
            description: `Results have been sent to user ${userId}.`
        });
    }

    const handleEvaluate = async (code: string, question: string) => {
        setIsEvaluating(true);
        setAiEvaluation(null);
        setSelectedCode({ code, question });

        const result = await evaluateCodeAction(code, question);

        if(result.success && result.data) {
            setAiEvaluation(result.data);
        } else {
            toast({
                title: "Evaluation Failed",
                description: result.message,
                variant: 'destructive',
            })
        }
        setIsEvaluating(false);
    }

  const resultsWithQuizInfo = initialResults.map(result => {
    const quiz = quizzes.find(q => q.id === result.quizId);
    return { ...result, quizTitle: quiz?.title || 'Unknown Quiz' };
  }).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Quiz Title</TableHead>
            <TableHead>User ID</TableHead>
            <TableHead>Submitted At</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resultsWithQuizInfo.length > 0 ? (
            resultsWithQuizInfo.map(result => (
              <TableRow key={result.id}>
                <TableCell className="font-medium">{result.quizTitle}</TableCell>
                <TableCell>{result.userId}</TableCell>
                <TableCell>{new Date(result.submittedAt).toLocaleString()}</TableCell>
                <TableCell><Badge variant="outline">Completed</Badge></TableCell>
                <TableCell className="text-right space-x-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon"><View className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>Submission Details: {result.quizTitle}</DialogTitle>
                                <DialogDescription>User: {result.userId}</DialogDescription>
                            </DialogHeader>
                            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
                                {result.answers.map(answer => {
                                    const question = quizzes.find(q => q.id === result.quizId)?.questions.find(q => q.id === answer.questionId);
                                    if(!question) return null;
                                    return (
                                        <div key={answer.questionId} className="rounded-md border p-4">
                                            <p className="font-semibold">{question.question}</p>
                                            {question.type === 'multiple-choice' ? (
                                                <p>Answer: <span className="font-mono bg-muted px-2 py-1 rounded">{answer.answer}</span></p>
                                            ) : (
                                                <div>
                                                    <pre className="mt-2 w-full overflow-auto rounded-md bg-muted p-4 font-code text-xs">
                                                        <code>{answer.answer}</code>
                                                    </pre>
                                                    <Dialog onOpenChange={(open) => !open && setAiEvaluation(null)}>
                                                        <DialogTrigger asChild>
                                                            <Button size="sm" className="mt-2" variant="secondary" onClick={() => handleEvaluate(answer.answer, question.description)}>
                                                                <BrainCircuit className="mr-2 h-4 w-4" /> Evaluate with AI
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>AI Code Evaluation</DialogTitle>
                                                            </DialogHeader>
                                                            {isEvaluating && <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}
                                                            {aiEvaluation && (
                                                                <div className="space-y-4">
                                                                    <div><Badge>Score: {aiEvaluation.score}/100</Badge></div>
                                                                    <p className="text-sm whitespace-pre-wrap">{aiEvaluation.feedback}</p>
                                                                </div>
                                                            )}
                                                        </DialogContent>
                                                    </Dialog>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Button variant="ghost" size="icon" onClick={() => handleSendEmail(result.userId)}>
                        <Mail className="h-4 w-4" />
                    </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No results found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
