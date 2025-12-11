export type QuestionType = 'multiple-choice' | 'coding';

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  question: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  options: string[];
  answer: string;
}

export interface CodingQuestion extends BaseQuestion {
  type: 'coding';
  description: string;
  language: string;
  template: string;
  testCases: {
    input: string;
    expectedOutput: string;
  }[];
}

export type Question = MultipleChoiceQuestion | CodingQuestion;

export interface Quiz {
  id: string;
  title: string;
  description: string;
  skill: string;
  questions: Question[];
}

export type UserAnswer = {
  questionId: string;
  answer: string;
}

export interface TestResult {
  id: string;
  quizId: string;
  userId: string; // In a real app, this would be a user ID
  submittedAt: string;
  answers: UserAnswer[];
  score?: number; // Optional, as coding questions might need manual review
}
