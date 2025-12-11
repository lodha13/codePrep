"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { QuizResult } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle, XCircle } from "lucide-react";

export default function ResultPage() {
    const { id } = useParams();
    const [result, setResult] = useState<QuizResult | null>(null);

    useEffect(() => {
        const fetchResult = async () => {
            if (!id) return;
            const ref = doc(db, "results", id as string);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                setResult({ id: snap.id, ...snap.data() } as QuizResult);
            }
        };
        fetchResult();
    }, [id]);

    if (!result) return <div className="p-8">Loading Result...</div>;

    const percentage = Math.round((result.score / result.totalScore) * 100);

    return (
        <div className="max-w-3xl mx-auto p-8 space-y-8">
            <Card className="text-center py-10">
                <CardHeader>
                    <CardTitle className="text-4xl">{percentage}%</CardTitle>
                    <p className="text-muted-foreground">You scored {result.score} out of {result.totalScore}</p>
                </CardHeader>
                <CardContent>
                    <Link href="/">
                        <Button>Back to Dashboard</Button>
                    </Link>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h2 className="text-xl font-bold">Detailed Breakdown</h2>
                {Object.values(result.answers).map((ans, idx) => (
                    <Card key={idx} className="flex justify-between items-center p-4">
                        <div className="flex items-center gap-3">
                            {ans.status === 'correct' ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}
                            <div>
                                <p className="font-medium">Question {idx + 1}</p>
                                <p className="text-xs text-mono text-gray-500 truncate max-w-[300px]">{ans.userAnswer || "No Answer"}</p>
                            </div>
                        </div>
                        <div className="font-bold">
                            {ans.score} pts
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
