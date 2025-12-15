import { db } from "@/lib/firebase";
import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { NextResponse } from "next/server";
import { Question, Quiz } from "@/types/schema";

export async function GET() {
    try {
        const now = Timestamp.now();

        // 1. Questions for Java Multithreading
        const q1: Question = {
            id: "q_java_thread_1",
            title: "Thread State",
            description: "What is the state of a thread after it invokes `wait()`?",
            type: "mcq",
            difficulty: "medium",
            createdAt: now,
            options: ["RUNNABLE", "WAITING", "BLOCKED", "TERMINATED"],
            correctOptionIndex: 1,
            codeSnippet: "synchronized(obj) { \n  obj.wait(); \n}",
        };

        const q2: Question = {
            id: "q_java_thread_2",
            title: "Thread Safety",
            description: "Which collection is thread-safe by default?",
            type: "mcq",
            difficulty: "easy",
            createdAt: now,
            options: ["ArrayList", "HashMap", "Vector", "HashSet"],
            correctOptionIndex: 2
        };

        // 2. Questions for Java Collections
        const q3: Question = {
            id: "q_java_coll_1",
            title: "Map Interface",
            description: "What happens if you insert a duplicate key into a HashMap?",
            type: "mcq",
            difficulty: "medium",
            createdAt: now,
            options: ["Throws Exception", "Replaces the value", "Ignores the insertion", "Creates a second entry"],
            correctOptionIndex: 1
        };

        // 3. Coding Question with Test Cases
        const qCoding: Question = {
            id: "q_java_code_1",
            title: "Reverse a String",
            description: "Write a function that reverses a given string. You must handle null inputs gracefully.",
            type: "coding",
            difficulty: "easy",
            createdAt: now,
            language: "java",
            starterCode: "public class Solution {\n    public static String reverse(String str) {\n        // Your code here\n        return \"\";\n    }\n}",
            testCases: [
                { input: "\"hello\"", expectedOutput: "\"olleh\"", isHidden: false },
                { input: "\"Java\"", expectedOutput: "\"avaJ\"", isHidden: false },
                { input: "\"\"", expectedOutput: "\"\"", isHidden: true }, // Edge case
                { input: "null", expectedOutput: "null", isHidden: true }
            ]
        };

        // Upload Questions
        await setDoc(doc(db, "questions", q1.id), q1);
        await setDoc(doc(db, "questions", q2.id), q2);
        await setDoc(doc(db, "questions", q3.id), q3);
        await setDoc(doc(db, "questions", qCoding.id), qCoding);

        // Create Quizzes
        const quiz1: Quiz = {
            id: "quiz_java_multi",
            title: "Java Multithreading Mastery",
            description: "Deep dive into thread states, locking, and concurrency.",
            durationMinutes: 30,
            category: "Java",
            type: "assessment",
            questionIds: [q1.id, q2.id],
            createdBy: "admin",
            createdAt: now,
            isPublic: true,
            difficulty: "hard"
        };

        const quiz2: Quiz = {
            id: "quiz_java_coll",
            title: "Java Collections Framework",
            description: "Test your knowledge of Lists, Sets, and Maps.",
            durationMinutes: 20,
            category: "Java",
            type: "practice",
            questionIds: [q3.id],
            createdBy: "admin",
            createdAt: now,
            isPublic: true,
            difficulty: "medium"
        };

        const quiz3: Quiz = {
            id: "quiz_java_coding",
            title: "Java Coding Challenge: Algorithms",
            description: "Solve algorithmic problems with automated test cases.",
            durationMinutes: 45,
            category: "Coding",
            type: "assessment",
            questionIds: [qCoding.id],
            createdBy: "admin",
            createdAt: now,
            isPublic: true,
            difficulty: "medium"
        };

        await setDoc(doc(db, "quizzes", quiz1.id), quiz1);
        await setDoc(doc(db, "quizzes", quiz2.id), quiz2);
        await setDoc(doc(db, "quizzes", quiz3.id), quiz3);

        return NextResponse.json({ success: true, message: "Database seeded successfully!" });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
