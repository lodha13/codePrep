
import { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "candidate";

export interface User {
    uid: string;
    email: string;
    displayName?: string;
    role: UserRole;
    createdAt: Date;
    completedQuizIds?: string[];
    assignedQuizIds?: string[];
    photoURL?: string;
    groupIds?: string[];
    isBench?: boolean;
}

export interface Group {
    id: string;
    name: string;
    description?: string;
    createdBy: string;
    createdAt: Date;
    memberIds: string[];
    assignedQuizIds?: string[];
}

export interface Quiz {
    id: string;
    title: string;
    description?: string;
    durationMinutes: number;
    category: string;
    subCategory?: string;
    type: "assessment" | "practice";
    questionIds: string[];
    createdBy: string;
    createdAt: Date;
    isPublic: boolean;
    difficulty?: "easy" | "medium" | "hard";
    totalMarks?: number;
    assignedUserIds?: string[];
    assignedGroupIds?: string[];
}

export type QuestionType = "mcq" | "coding";

export interface BaseQuestion {
    id: string;
    title: string;
    description: string; // Markdown supported
    type: QuestionType;
    difficulty: "easy" | "medium" | "hard";
    createdAt: Date;
    mark: number;
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

// This mirrors the TestCaseResult in code-execution.ts
export interface TestCaseResult {
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
}

export interface QuestionResult {
    questionId: string;
    timeTakenSeconds?: number;
    status: "correct" | "incorrect" | "partial" | "unanswered";
    score: number;
    total: number; // The maximum possible score for this question.
    userAnswer?: string; // Index for MCQ, Code for Coding
    testCaseResults?: TestCaseResult[]; // For coding questions
}

export interface QuizResult {
    id: string;
    quizId: string;
    quizTitle: string; // Denormalized for faster reads
    userId: string;
    startedAt: Timestamp;
    completedAt?: Timestamp;
    score: number;
    totalScore: number;
    status: "in-progress" | "completed";
    answers: Record<string, QuestionResult>; // Map questionId to result
    timeTakenSeconds?: number;
}
