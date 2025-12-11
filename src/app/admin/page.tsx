import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getQuizzes, getTestResults } from "../actions";
import { ListChecks, GraduationCap } from "lucide-react";

export default async function AdminDashboardPage() {
    const quizzes = await getQuizzes();
    const results = await getTestResults();

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h1 className="font-headline text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
                        <ListChecks className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{quizzes.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Available quizzes for users
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{results.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Total tests completed by users
                        </p>
                    </CardContent>
                </Card>
            </div>
            <div className="mt-8">
                <h2 className="text-2xl font-bold tracking-tight">Welcome, Admin!</h2>
                <p className="text-muted-foreground">
                    From this panel, you can manage quizzes, review user submissions, and oversee the platform.
                </p>
            </div>
        </div>
    );
}
