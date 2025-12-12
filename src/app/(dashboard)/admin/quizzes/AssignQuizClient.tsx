
'use client';

import { useState } from 'react';
import { Quiz, User } from '@/types/schema';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { assignQuizToUsers } from '../actions';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';


interface AssignQuizClientProps {
    quizzes: Quiz[];
    candidates: User[];
}

export function AssignQuizClient({ quizzes, candidates }: AssignQuizClientProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleAssignClick = (quiz: Quiz) => {
        setSelectedQuiz(quiz);
        setIsDialogOpen(true);
        setSelectedUserIds([]); // Reset selections
    };

    const handleUserToggle = (userId: string) => {
        setSelectedUserIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleAssignSubmit = async () => {
        if (!selectedQuiz || selectedUserIds.length === 0) {
            toast({
                variant: 'destructive',
                title: "Selection required",
                description: "Please select at least one user to assign the quiz to."
            });
            return;
        }

        setIsSubmitting(true);
        const result = await assignQuizToUsers(selectedQuiz.id, selectedUserIds);

        if (result.success) {
            toast({
                title: "Quiz Assigned!",
                description: `Successfully assigned "${selectedQuiz.title}" to ${selectedUserIds.length} user(s).`,
            });
            setIsDialogOpen(false);
        } else {
            toast({
                variant: 'destructive',
                title: "Assignment Failed",
                description: result.message || "An unknown error occurred.",
            });
        }
        setIsSubmitting(false);
    };

    return (
        <>
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
                                <TableHead className="text-right">Actions</TableHead>
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
                                    <TableCell>
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="outline" size="sm" disabled>
                                                Edit
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => handleAssignClick(quiz)}>
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                Assign
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Assign Quiz: {selectedQuiz?.title}</DialogTitle>
                        <DialogDescription>
                            Select the users you want to assign this quiz to.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <ScrollArea className="h-72 w-full rounded-md border">
                            <div className="p-4">
                                <h4 className="mb-4 text-sm font-medium leading-none">Candidates</h4>
                                {candidates.map((user) => (
                                    <div key={user.uid} className="flex items-center space-x-2 mb-2 p-2 rounded-md hover:bg-secondary">
                                        <Checkbox
                                            id={`user-${user.uid}`}
                                            checked={selectedUserIds.includes(user.uid)}
                                            onCheckedChange={() => handleUserToggle(user.uid)}
                                        />
                                        <label
                                            htmlFor={`user-${user.uid}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                                        >
                                            {user.displayName} ({user.email})
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button
                            type="submit"
                            onClick={handleAssignSubmit}
                            disabled={isSubmitting || selectedUserIds.length === 0}
                        >
                            {isSubmitting ? "Assigning..." : `Assign to ${selectedUserIds.length} User(s)`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
