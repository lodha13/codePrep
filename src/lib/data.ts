import type { Quiz, TestResult } from '@/lib/types';

export const quizzes: Quiz[] = [
  {
    id: 'dsa-1',
    title: 'Data Structures & Algorithms',
    description: 'A mix of fundamental data structures and algorithms questions.',
    skill: 'Data Structures',
    questions: [
      {
        id: 'q1',
        type: 'multiple-choice',
        question: 'What is the time complexity of a binary search algorithm?',
        options: ['O(n)', 'O(log n)', 'O(n^2)', 'O(1)'],
        answer: 'O(log n)',
        mark: 10,
      },
      {
        id: 'q2',
        type: 'multiple-choice',
        question: 'Which data structure uses LIFO (Last-In, First-Out)?',
        options: ['Queue', 'Stack', 'Linked List', 'Tree'],
        answer: 'Stack',
        mark: 10,
      },
      {
        id: 'q3',
        type: 'coding',
        question: 'Two Sum Problem',
        description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
        language: 'java',
        template: `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your code here
        return new int[0];
    }
}`,
        testCases: [
          { input: '[2, 7, 11, 15], 9', expectedOutput: '[0, 1]' },
          { input: '[3, 2, 4], 6', expectedOutput: '[1, 2]' },
        ],
        mark: 20,
      },
    ],
  },
  {
    id: 'frontend-1',
    title: 'React Fundamentals',
    description: 'Test your knowledge on core React concepts.',
    skill: 'Frontend',
    questions: [
      {
        id: 'q1',
        type: 'multiple-choice',
        question: 'Which hook is used to manage state in a functional component?',
        options: ['useEffect', 'useState', 'useContext', 'useReducer'],
        answer: 'useState',
        mark: 10,
      },
      {
        id: 'q2',
        type: 'multiple-choice',
        question: 'How do you pass data from a parent component to a child component?',
        options: ['State', 'Context', 'Props', 'Redux'],
        answer: 'Props',
        mark: 10,
      },
    ]
  }
];

export const testResults: TestResult[] = [];
