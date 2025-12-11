'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { MultipleChoiceQuestion as MCQ } from '@/lib/types';

interface MultipleChoiceQuestionProps {
  question: MCQ;
  onAnswerChange: (answer: string) => void;
  selectedAnswer: string;
}

export function MultipleChoiceQuestion({ question, onAnswerChange, selectedAnswer }: MultipleChoiceQuestionProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold md:text-2xl">{question.question}</h2>
      <RadioGroup value={selectedAnswer} onValueChange={onAnswerChange} className="space-y-4">
        {question.options.map((option, index) => (
          <div key={index} className="flex items-center space-x-3 rounded-md border p-4 transition-colors hover:bg-accent/10 has-[[data-state=checked]]:bg-accent/20 has-[[data-state=checked]]:border-accent">
            <RadioGroupItem value={option} id={`q-${question.id}-option-${index}`} />
            <Label htmlFor={`q-${question.id}-option-${index}`} className="flex-1 cursor-pointer text-base">
              {option}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
