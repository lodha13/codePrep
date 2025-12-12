"use server";

import Link from "next/link";
import { getQuizzes } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { PlusCircle, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function AdminQuizzesPage() {
    const quizzes = await getQuizzes();

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

            <Card>
                <CardHeader>
                    <CardTitle>All Quizzes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Questions</TableHead>
                                <TableHead>Visibility</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quizzes.map((quiz) => (
                                <TableRow key={quiz.id}>
                                    <TableCell className="font-medium">{quiz.title}</TableCell>
                                    <TableCell>{quiz.category}</TableCell>
                                    <TableCell>{quiz.questionIds.length}</TableCell>
                                    <TableCell>
                                        <Badge variant={quiz.isPublic ? "default" : "secondary"}>
                                            {quiz.isPublic ? "Public" : "Private"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="space-x-2">
                                        <Button variant="outline" size="sm">
                                            Edit
                                        </Button>
                                        <Button variant="outline" size="sm">
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            Assign
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
