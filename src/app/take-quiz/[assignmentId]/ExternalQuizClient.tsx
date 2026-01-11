
'use client';

import { useState } from 'react';
import { ExternalCandidate, Quiz, Question } from '@/types/schema';
import QuizInstructions from '@/components/quiz/QuizInstructions';
import QuizRunner from '@/components/quiz/QuizRunner';

// Create a type for the props where Timestamps have been converted to strings
type SerializableExternalCandidate = Omit<ExternalCandidate, 'createdAt' | 'expiresAt'> & {
    createdAt: string;
    expiresAt: string;
};

// Create serializable types for Quiz and Question
type SerializableQuiz = Omit<Quiz, 'createdAt'> & {
    createdAt: string;
};

type SerializableQuestion = Omit<Question, 'createdAt'> & {
    createdAt: string;
};

interface ExternalQuizClientProps {
    assignment: SerializableExternalCandidate;
    quiz: SerializableQuiz;
    questions: SerializableQuestion[];
}

export default function ExternalQuizClient({ assignment, quiz, questions }: ExternalQuizClientProps) {
    const [quizStarted, setQuizStarted] = useState(false);

    if (!quizStarted) {
        // We can cast the assignment object to User for display purposes in instructions,
        // as it has compatible fields like name/displayName and email.
        return (
            <QuizInstructions
                quiz={quiz}
                user={assignment}
                onStart={() => setQuizStarted(true)}
            />
        );
    }
    
    return (
        <QuizRunner
            mode="external"
            quiz={quiz}
            questions={questions}
            externalCandidate={assignment}
        />
    );
}
