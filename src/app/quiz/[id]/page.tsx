"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, getDocs, collection, query, where, documentId } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Quiz, Question } from "@/types/schema";
import QuizRunner from "@/components/quiz/QuizRunner";

export default function QuizPage() {
    const { id } = useParams(); // quiz id
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;

            const quizRef = doc(db, "quizzes", id as string);
            const quizSnap = await getDoc(quizRef);

            if (quizSnap.exists()) {
                const quizData = { id: quizSnap.id, ...quizSnap.data() } as Quiz;
                setQuiz(quizData);

                if (quizData.questionIds && quizData.questionIds.length > 0) {
                    // Firestore 'in' query supports max 10 items. 
                    // For MVP we assume < 10 questions or we implement batch fetching.
                    // Using logic to fetch all questions for now if list is small.

                    const qQuery = query(collection(db, "questions"), where(documentId(), "in", quizData.questionIds));
                    const qSnap = await getDocs(qQuery);
                    const qList = qSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));

                    // Reorder based on ID list order
                    const orderedQuestions = quizData.questionIds.map(qid => qList.find(q => q.id === qid)).filter(Boolean) as Question[];

                    setQuestions(orderedQuestions);
                }
            }
            setLoading(false);
        };

        fetchData();
    }, [id]);

    if (loading) return <div className="p-8 text-center">Loading Quiz...</div>;
    if (!quiz) return <div className="p-8 text-center">Quiz not found.</div>;

    return <QuizRunner quiz={quiz} questions={questions} />;
}
