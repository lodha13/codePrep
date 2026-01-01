
import { getDoc, doc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ExternalCandidate, Quiz, Question } from '@/types/schema';
import ExternalQuizClient from './ExternalQuizClient';
import { notFound } from 'next/navigation';

interface ExternalQuizPageProps {
    params: {
        assignmentId: string;
    };
}

async function getExternalQuizData(assignmentId: string) {
    // 1. Fetch the assignment
    const assignmentRef = doc(db, 'externalCandidates', assignmentId);
    const assignmentSnap = await getDoc(assignmentRef);

    const assignmentData = assignmentSnap.data();

    if (!assignmentSnap.exists() || assignmentData.resultId) {
        // Link is invalid or quiz has already been completed
        return null;
    }
    
    const assignment = { id: assignmentSnap.id, ...assignmentData } as ExternalCandidate;

    // Check for expiration
    if (assignment.expiresAt && assignment.expiresAt.toDate() < new Date()) {
        return null;
    }

    // 2. Fetch the quiz
    const quizRef = doc(db, 'quizzes', assignment.quizId);
    const quizSnap = await getDoc(quizRef);
    if (!quizSnap.exists()) return null;
    const quiz = { id: quizSnap.id, ...quizSnap.data() } as Quiz;

    // 3. Fetch the questions
    const questions: Question[] = [];
    for (const questionId of quiz.questionIds) {
        const questionRef = doc(db, 'questions', questionId);
        const questionSnap = await getDoc(questionRef);
        if (questionSnap.exists()) {
            questions.push({ id: questionSnap.id, ...questionSnap.data() } as Question);
        }
    }

    // Convert Timestamps to serializable format (ISO strings)
    const serializableAssignment = {
        ...assignment,
        createdAt: (assignment.createdAt as any).toDate().toISOString(),
        expiresAt: (assignment.expiresAt as any).toDate().toISOString(),
    };

    const serializableQuiz = {
        ...quiz,
        createdAt: (quiz.createdAt as any).toDate().toISOString(),
    };

    const serializableQuestions = questions.map(q => ({
        ...q,
        createdAt: (q.createdAt as any).toDate().toISOString(),
    }));
    
    return { assignment: serializableAssignment, quiz: serializableQuiz, questions: serializableQuestions };
}

export default async function ExternalQuizPage({ params }: ExternalQuizPageProps) {
    const data = await getExternalQuizData(params.assignmentId);

    if (!data) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-gray-100 p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-destructive mb-4">Link Invalid or Expired</h1>
                    <p className="text-muted-foreground">This quiz link is either invalid or the quiz has already been completed.</p>
                    <p className="text-muted-foreground">Please contact the person who sent you this link for assistance.</p>
                </div>
            </div>
        );
    }
    
    const { assignment, quiz, questions } = data;

    return <ExternalQuizClient assignment={assignment} quiz={quiz} questions={questions} />;
}
