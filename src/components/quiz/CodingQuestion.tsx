'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { CodingQuestion as CQ } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { PlayCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CodingQuestionProps {
  question: CQ;
  onAnswerChange: (answer: string) => void;
  codeAnswer: string;
}

export function CodingQuestion({ question, onAnswerChange, codeAnswer }: CodingQuestionProps) {
  const { toast } = useToast();

  const handleRunCode = () => {
    // This is a simulation. In a real app, this would call a code execution service.
    toast({
        title: "Running Code...",
        description: "Test cases are being executed against your solution."
    });
    // Simulate a delay for running code.
    setTimeout(() => {
        toast({
            title: "Execution Finished",
            description: "Test Case 1: Passed, Test Case 2: Passed. This is a simulation.",
        });
    }, 2000);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-headline text-2xl font-semibold md:text-3xl">{question.question}</h2>
        <p className="text-muted-foreground">{question.description}</p>
      </div>

      <div>
        <h3 className="mb-2 font-semibold">Your Code ({question.language})</h3>
        <div className="relative">
          <Textarea
            value={codeAnswer || question.template}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder="Write your code here..."
            className="min-h-[300px] font-code text-sm"
          />
          {/* In a real app, you would integrate a proper code editor like Monaco or CodeMirror here for intellisense */}
        </div>
      </div>
      
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <Button onClick={handleRunCode} variant="secondary">
          <PlayCircle className="mr-2" /> Run Code
        </Button>
      </div>

      <div>
        <h3 className="mb-2 font-semibold">Test Cases</h3>
        <div className="space-y-2">
            {question.testCases.map((tc, index) => (
                <Card key={index} className="bg-muted/50">
                    <CardHeader className='p-4'>
                        <CardTitle className="text-sm font-medium">Test Case {index + 1}</CardTitle>
                    </CardHeader>
                    <CardContent className='p-4 pt-0'>
                        <p className="font-code text-xs"><span className="font-semibold">Input:</span> {tc.input}</p>
                        <p className="font-code text-xs"><span className="font-semibold">Expected Output:</span> {tc.expectedOutput}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
      </div>
    </div>
  );
}
