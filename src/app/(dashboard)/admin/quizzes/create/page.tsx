"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { Quiz, Question } from "@/types/schema";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function CreateQuizPage() {
    const [title, setTitle] = useState("");
    const [duration, setDuration] = useState(60);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { user } = useAuth();

    useEffect(() => {
        const fetchQuestions = async () => {
            const snapshot = await getDocs(collection(db, "questions"));
            const qList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Question));
            setQuestions(qList);
            setLoading(false);
        };
        fetchQuestions();
    }, []);

    const handleCreate = async () => {
        if (!user) return;

        // @ts-ignore
        const newQuiz: Omit<Quiz, "id"> = {
            title,
            description: "Created via Admin Panel",
            durationMinutes: Number(duration),
            category: "General",
            type: "assessment",
            questionIds: selectedQuestionIds,
            createdBy: user.uid,
            createdAt: Timestamp.now(),
            isPublic: true,
        };

        await addDoc(collection(db, "quizzes"), newQuiz);
        router.push("/admin/quizzes");
    };

    const toggleQuestion = (id: string) => {
        setSelectedQuestionIds(prev =>
            prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]
        );
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Create New Quiz</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Quiz Title</Label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Duration (Minutes)</Label>
                        <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
                    </div>

                    <div className="mt-6">
                        <Label>Select Questions ({selectedQuestionIds.length} selected)</Label>
                        <div className="border rounded-md max-h-[400px] overflow-y-auto mt-2 p-2 space-y-2">
                            {questions.map(q => (
                                <div key={q.id} className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded">
                                    <input
                                        type="checkbox"
                                        checked={selectedQuestionIds.includes(q.id)}
                                        onChange={() => toggleQuestion(q.id)}
                                        className="h-4 w-4"
                                    />
                                    <div>
                                        <p className="font-medium text-sm">{q.title}</p>
                                        <span className="text-xs text-gray-500 uppercase">{q.type} • {q.difficulty}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Button onClick={handleCreate} disabled={!title || selectedQuestionIds.length === 0} className="w-full mt-4">
                        Create Quiz
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
