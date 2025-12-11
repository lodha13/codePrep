import { getQuizzes } from "@/app/actions";
import { QuizManager } from "@/components/admin/QuizManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminQuizzesPage() {
    const quizzes = await getQuizzes();
    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h1 className="font-headline text-3xl font-bold tracking-tight">Quiz Management</h1>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                <QuizManager />

                <Card>
                    <CardHeader>
                        <CardTitle>Existing Quizzes</CardTitle>
                        <CardDescription>A list of all quizzes currently in the system.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                        {quizzes.map(quiz => (
                            <div key={quiz.id} className="rounded-lg border p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold">{quiz.title}</h3>
                                        <p className="text-sm text-muted-foreground">{quiz.description}</p>
                                    </div>
                                    <Badge variant="secondary">{quiz.skill}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">{quiz.questions.length} questions</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
