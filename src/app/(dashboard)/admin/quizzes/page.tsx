
"use server";

import Link from "next/link";
import { getQuizzes, getUsers } from "../actions";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { AssignQuizClient } from './AssignQuizClient';

export default async function AdminQuizzesPage() {
    // Fetch both quizzes and users in parallel
    const [quizzes, allUsers] = await Promise.all([
        getQuizzes(),
        getUsers()
    ]);
    
    const candidates = allUsers.filter(u => u.role === 'candidate');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Quiz Management</h1>
                    <p className="text-gray-500">View, create, and manage quizzes.</p>
                </div>
                <Button asChild>
                    <Link href="/admin/quizzes/create">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Quiz
                    </Link>
                </Button>
            </div>
            <AssignQuizClient quizzes={quizzes} candidates={candidates} />
        </div>
    );
}

