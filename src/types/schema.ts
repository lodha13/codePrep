import { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "candidate";

export interface User {
    uid: string;
    email: string;
    displayName?: string;
    role: UserRole;
    createdAt: Date; // Changed to Date for consistency
    completedQuizIds?: string[];
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
    createdBy: string; // User ID
    createdAt: Date;
    isPublic: boolean;
    difficulty?: "easy" | "medium" | "hard";
}

export type QuestionType = "mcq" | "coding";

export interface BaseQuestion {
    id: string;
    title: string;
    description: string; // Markdown supported
    type: QuestionType;
    difficulty: "easy" | "medium" | "hard";
    createdAt: Date;
    // New property for image-based questions
    imageUrl?: string;
}

export interface MCQQuestion extends BaseQuestion {
    type: "mcq";
    options: string[];
    correctOptionIndex: number;
}

export interface TestCase {
    input: string;
    expectedOutput: string;
    isHidden: boolean; // Control visibility to candidate
}

export interface CodingQuestion extends BaseQuestion {
    type: "coding";
    language: "javascript" | "python" | "java" | "cpp";
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
    startedAt: Date;
    completedAt?: Date;
    score: number;
    totalScore: number;
    status: "in-progress" | "completed";
    answers: Record<string, QuestionResult>; // Map questionId to result
}
