import { getQuizzes, getTestResults } from "@/app/actions";
import { ResultsDashboard } from "@/components/admin/ResultsDashboard";

export default async function AdminResultsPage() {
    const results = await getTestResults();
    const quizzes = await getQuizzes();

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h1 className="font-headline text-3xl font-bold tracking-tight">User Submissions</h1>
            </div>
            <ResultsDashboard results={results} quizzes={quizzes} />
        </div>
    );
}
