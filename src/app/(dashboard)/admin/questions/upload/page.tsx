"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

export default function UploadQuestionsPage() {
    const [jsonInput, setJsonInput] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleUpload = async () => {
        setLoading(true);
        // In a real application, you would parse the JSON and
        // use a server action to batch-write the questions to Firestore.
        console.log("Uploading:", jsonInput);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            const questions = JSON.parse(jsonInput);
            if (!Array.isArray(questions)) {
                throw new Error("JSON must be an array of questions.");
            }
            toast({
                title: "Upload Successful",
                description: `${questions.length} questions would have been uploaded. (Simulation)`,
            });
            setJsonInput("");
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Invalid JSON",
                description: error.message || "Please check the format of your JSON file.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold">Upload Questions</h1>
            <p className="text-gray-500">
                Bulk-upload questions by pasting a JSON array of question objects.
            </p>

            <Card>
                <CardHeader>
                    <CardTitle>JSON Input</CardTitle>
                    <CardDescription>
                        Paste the content of your questions JSON file here. Ensure it's a valid array of question objects.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder='[{"id": "q1", "title": "My First Question", ...}]'
                        className="min-h-[300px] font-mono"
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                    />
                    <Button onClick={handleUpload} disabled={loading || !jsonInput}>
                        {loading ? "Uploading..." : "Upload Questions"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
