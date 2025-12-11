import { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "candidate";

export interface User {
    uid: string;
    email: string;
    displayName?: string;
    role: UserRole;
    createdAt: Timestamp;
}

export interface Quiz {
    id: string;
    title: string;
    description?: string;
    durationMinutes: number; // 0 for unlimited
    category: string;
    subCategory?: string;
    type: "assessment" | "practice";
    questionIds: string[];
    createdBy: string;
    createdAt: Timestamp;
    isPublic: boolean;
}

export type QuestionType = "mcq" | "coding";

export interface BaseQuestion {
    id: string;
    quizId?: string; // Optional, as questions might be in a bank
    title: string;
    description: string; // Markdown supported
    type: QuestionType;
    difficulty: "easy" | "medium" | "hard";
    createdAt: Timestamp;
}

export interface MCQQuestion extends BaseQuestion {
    type: "mcq";
    options: string[];
    correctOptionIndex: number;
}

export interface TestCase {
    input: string;
    expectedOutput: string;
    isHidden?: boolean;
}

export interface CodingQuestion extends BaseQuestion {
    type: "coding";
    language: "javascript" | "python" | "java" | "cpp"; // default language
    starterCode: string;
    testCases: TestCase[];
    solutionCode?: string; // For reference/grading
}

export type Question = MCQQuestion | CodingQuestion;

export interface QuestionResult {
    questionId: string;
    timeTakenSeconds: number;
    status: "correct" | "incorrect" | "partial";
    score: number;
    userAnswer?: string | number; // Index for MCQ, Code for Coding
    output?: string; // For coding questions
}

export interface QuizResult {
    id: string;
    quizId: string;
    userId: string;
    startedAt: Timestamp;
    completedAt?: Timestamp;
    score: number;
    totalScore: number;
    status: "in-progress" | "completed";
    answers: Record<string, QuestionResult>; // Map questionId to result
}
