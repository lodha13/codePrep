// To run this seed script, you need to have `tsx` installed:
// npm install -g tsx
// Then run: `tsx src/lib/seed.ts`
// Make sure your firebase config is available in environment variables.

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, writeBatch, doc } from 'firebase/firestore';
import { CodingQuestion, MCQQuestion, Quiz } from '@/types/schema';

// IMPORTANT: Replace with your actual Firebase config from the Firebase console
// or ensure these environment variables are set.
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const seedDatabase = async () => {
    console.log('Starting to seed database...');
    const batch = writeBatch(db);

    // --- Questions Data ---
    const questions: (MCQQuestion | CodingQuestion)[] = [
        // Java Collections Questions
        {
            id: 'col_q1',
            title: 'What will be the output of the following Java code?',
            description: 'Analyze the code snippet related to `HashSet` and determine the final output printed to the console.',
            type: 'mcq',
            difficulty: 'medium',
            createdAt: new Date(),
            imageUrl: 'https://picsum.photos/seed/code1/600/200',
            options: [
                '5',
                '2',
                '3',
                'The code will throw a compilation error.',
            ],
            correctOptionIndex: 2,
        },
        {
            id: 'col_q2',
            title: 'Which collection class is synchronized?',
            description: 'Identify the collection class from the options that is inherently thread-safe.',
            type: 'mcq',
            difficulty: 'easy',
            createdAt: new Date(),
            options: [
                'ArrayList',
                'LinkedList',
                'Vector',
                'HashSet',
            ],
            correctOptionIndex: 2,
        },
        // Java Multithreading Questions
        {
            id: 'multi_q1',
            title: 'What is the state of a thread when it is created?',
            description: 'When a new thread is instantiated (e.g., `Thread t = new Thread()`), what is its initial state before `start()` is called?',
            type: 'mcq',
            difficulty: 'easy',
            createdAt: new Date(),
            options: ['RUNNABLE', 'BLOCKED', 'NEW', 'TERMINATED'],
            correctOptionIndex: 2,
        },
        {
            id: 'multi_q2',
            title: 'Output of Multithreading Code',
            description: 'What will be the output of the following code snippet involving two threads operating on a shared object?',
            type: 'mcq',
            difficulty: 'hard',
            createdAt: new Date(),
            imageUrl: 'https://picsum.photos/seed/code2/600/400',
            options: ['Count is 20000', 'Count is 10000', 'Count is something less than 20000', 'The code will result in a deadlock.'],
            correctOptionIndex: 2,
        },
        // Coding Question
        {
            id: 'code_q1',
            title: 'Find Two Sum',
            description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution, and you may not use the same element twice. Return the indices in an array of size two.',
            type: 'coding',
            difficulty: 'medium',
            language: 'java',
            createdAt: new Date(),
            starterCode: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your code here\n    }\n}`,
            testCases: [
                { input: 'nums = [2,7,11,15], target = 9', expectedOutput: '[0,1]', isHidden: false },
                { input: 'nums = [3,2,4], target = 6', expectedOutput: '[1,2]', isHidden: false },
                { input: 'nums = [3,3], target = 6', expectedOutput: '[0,1]', isHidden: true },
                { input: 'nums = [-1,-2,-3,-4,-5], target = -8', expectedOutput: '[2,4]', isHidden: true },
            ],
            solutionCode: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        Map<Integer, Integer> map = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int complement = target - nums[i];\n            if (map.containsKey(complement)) {\n                return new int[] { map.get(complement), i };\n            }\n            map.put(nums[i], i);\n        }\n        throw new IllegalArgumentException("No two sum solution");\n    }\n}`
        }
    ];


    // --- Quizzes Data ---
    const quizzes: Quiz[] = [
        {
            id: 'java-collections-quiz',
            title: 'Java Collections Framework',
            description: 'Test your knowledge on Java\'s core collection interfaces and classes.',
            durationMinutes: 15,
            category: 'Programming',
            subCategory: 'Java',
            type: 'assessment',
            questionIds: ['col_q1', 'col_q2'],
            createdBy: 'admin_user_id', // Replace with a real admin ID if needed
            createdAt: new Date(),
            isPublic: true,
        },
        {
            id: 'java-multithreading-quiz',
            title: 'Java Multithreading Concepts',
            description: 'An assessment on threads, synchronization, and concurrency in Java.',
            durationMinutes: 25,
            category: 'Programming',
            subCategory: 'Java',
            type: 'assessment',
            questionIds: ['multi_q1', 'multi_q2', 'code_q1'],
            createdBy: 'admin_user_id',
            createdAt: new Date(),
            isPublic: true,
        }
    ];

    // Add questions to batch
    const questionsRef = collection(db, 'questions');
    questions.forEach((question) => {
        const questionDoc = doc(questionsRef, question.id);
        batch.set(questionDoc, question);
    });
    console.log(`${questions.length} questions prepared for seeding.`);


    // Add quizzes to batch
    const quizzesRef = collection(db, 'quizzes');
    quizzes.forEach((quiz) => {
        const quizDoc = doc(quizzesRef, quiz.id);
        batch.set(quizDoc, quiz);
    });
    console.log(`${quizzes.length} quizzes prepared for seeding.`);


    try {
        await batch.commit();
        console.log('Database seeded successfully!');
    } catch (error) {
        console.error('Error seeding database: ', error);
    } finally {
        // Exit the script
        process.exit(0);
    }
};

seedDatabase();
