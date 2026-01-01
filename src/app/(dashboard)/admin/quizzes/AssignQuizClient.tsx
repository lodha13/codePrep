'use client';

import { useState, useEffect } from 'react';
import { Quiz, User, Group } from '@/types/schema';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import Pagination from '@/components/ui/pagination';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { UserPlus, Edit, Search, Users, Share2, CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2 } from 'lucide-react';
import { assignQuizToUsers } from '../actions';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from "@/components/ui/calendar";
import { getGroups, assignQuizToUsersAndGroups } from '@/lib/admin-utils';
import { getFunctions, httpsCallable } from "firebase/functions";
import { cn } from '@/lib/utils';
import { app } from '@/lib/firebase';


type SerializableQuiz = Omit<Quiz, 'createdAt'> & {
    createdAt: string;
};
type SerializableUser = Omit<User, 'createdAt'> & {
    createdAt: string;
};

interface AssignQuizClientProps {
    quizzes: SerializableQuiz[];
    candidates: SerializableUser[];
}

export function AssignQuizClient({ quizzes, candidates }: AssignQuizClientProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isExternalDialogOpen, setIsExternalDialogOpen] = useState(false);
    const [selectedQuiz, setSelectedQuiz] = useState<SerializableQuiz | null>(null);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [selectedQuizIds, setSelectedQuizIds] = useState<string[]>([]);
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
    const [externalCandidateName, setExternalCandidateName] = useState('');
    const [externalCandidateEmail, setExternalCandidateEmail] = useState('');
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<Date | undefined>(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [titleFilter, setTitleFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [questionsFilter, setQuestionsFilter] = useState('');
    const [groupsFilter, setGroupsFilter] = useState('');
    const [visibilityFilter, setVisibilityFilter] = useState('');
    const [questionsSortOrder, setQuestionsSortOrder] = useState<'asc' | 'desc' | null>(null);
    const [groups, setGroups] = useState<Group[]>([]);
    const [filteredQuizzes, setFilteredQuizzes] = useState<SerializableQuiz[]>(quizzes);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const { toast } = useToast();

    useEffect(() => {
        const loadGroups = async () => {
            try {
                const groupsData = await getGroups();
                setGroups(groupsData);
            } catch (error) {
                console.error('Error loading groups:', error);
            }
        };
        loadGroups();
    }, []);

    useEffect(() => {
        let filtered = quizzes;
        
        // Global search
        if (searchTerm) {
            filtered = filtered.filter(quiz =>
                quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                quiz.category.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        // Column filters
        if (titleFilter) {
            filtered = filtered.filter(quiz => 
                quiz.title.toLowerCase().includes(titleFilter.toLowerCase())
            );
        }
        
        if (categoryFilter) {
            filtered = filtered.filter(quiz => 
                quiz.category.toLowerCase().includes(categoryFilter.toLowerCase())
            );
        }
        
        if (questionsFilter) {
            const count = parseInt(questionsFilter);
            if (!isNaN(count)) {
                filtered = filtered.filter(quiz => quiz.questionIds.length === count);
            }
        }
        
        if (groupsFilter) {
            filtered = filtered.filter(quiz => {
                const assignedGroups = groups.filter(g => quiz.assignedGroupIds?.includes(g.id));
                return assignedGroups.some(g => g.name.toLowerCase().includes(groupsFilter.toLowerCase()));
            });
        }
        
        if (visibilityFilter) {
            const isPublic = visibilityFilter.toLowerCase() === 'public';
            filtered = filtered.filter(quiz => quiz.isPublic === isPublic);
        }
        
        // Sort by questions count if enabled
        if (questionsSortOrder) {
            filtered.sort((a, b) => {
                const aCount = a.questionIds.length;
                const bCount = b.questionIds.length;
                return questionsSortOrder === 'asc' ? aCount - bCount : bCount - aCount;
            });
        }
        
        setFilteredQuizzes(filtered);
        setPage(1);
    }, [quizzes, searchTerm, titleFilter, categoryFilter, questionsFilter, groupsFilter, visibilityFilter, questionsSortOrder, groups]);

    const handleAssignClick = (quiz: SerializableQuiz) => {
        setSelectedQuiz(quiz);
        setIsDialogOpen(true);
        setSelectedUserIds([]); // Reset selections
    };

    const handleExternalAssignClick = (quiz: SerializableQuiz) => {
        setSelectedQuiz(quiz);
        setGeneratedLink(null);
        setExternalCandidateName('');
        setExternalCandidateEmail('');
        setExpiresAt(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
        setIsExternalDialogOpen(true);
    };

    const handleDeleteClick = (quiz: SerializableQuiz) => {
        setSelectedQuiz(quiz);
        setIsDeleteDialogOpen(true);
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

    const handleDeleteConfirm = async () => {
        if (!selectedQuiz) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/quizzes/${selectedQuiz.id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast({
                    title: 'Quiz Deleted',
                    description: `Successfully deleted "${selectedQuiz.title}".`,
                });
                // Refresh the list of quizzes
                setFilteredQuizzes(filteredQuizzes.filter(q => q.id !== selectedQuiz.id));
            } else {
                const data = await response.json();
                toast({
                    variant: 'destructive',
                    title: 'Deletion Failed',
                    description: data.message || 'An unknown error occurred.',
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Deletion Failed',
                description: 'A network error occurred.',
            });
        } finally {
            setIsSubmitting(false);
            setIsDeleteDialogOpen(false);
        }
    };

    const handleBulkAssign = async () => {
        if (selectedQuizIds.length === 0 || selectedGroupIds.length === 0) {
            toast({
                variant: 'destructive',
                title: "Selection required",
                description: "Please select quizzes and groups."
            });
            return;
        }

        setIsSubmitting(true);
        try {
            for (const quizId of selectedQuizIds) {
                await assignQuizToUsersAndGroups(quizId, [], selectedGroupIds);
            }
            toast({
                title: "Bulk Assignment Complete!",
                description: `Assigned ${selectedQuizIds.length} quizzes to ${selectedGroupIds.length} groups.`,
            });
            setIsBulkDialogOpen(false);
            setSelectedQuizIds([]);
            setSelectedGroupIds([]);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: "Bulk Assignment Failed",
                description: "An error occurred during bulk assignment.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGenerateLink = async () => {
        if (!selectedQuiz || !externalCandidateName || !externalCandidateEmail || !expiresAt) {
            toast({
                variant: 'destructive',
                title: "Missing Information",
                description: "Please provide all candidate details and an expiration date."
            });
            return;
        }
        setIsSubmitting(true);
        try {
            const functions = getFunctions(app, "us-central1");

            const createAndSend = httpsCallable(functions, 'createAndSendExternalAssignment');
            
            const result: any = await createAndSend({
                quizId: selectedQuiz.id,
                quizTitle: selectedQuiz.title,
                name: externalCandidateName,
                email: externalCandidateEmail,
                expiresAt: expiresAt.toISOString(),
            });

            if (result.data.success && result.data.generatedLink) {
                setGeneratedLink(result.data.generatedLink);
                toast({
                    title: "Email Sent & Link Generated!",
                    description: "The invitation has been sent to the candidate.",
                });
            } else {
                throw new Error(result.data.message || "Failed to create assignment or send email.");
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Operation Failed",
                description: error.message || "An unknown error occurred while calling the function.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSelectAllQuizzes = (checked: boolean) => {
        setSelectedQuizIds(checked ? filteredQuizzes.map(q => q.id) : []);
    };

    const handleQuizSelect = (quizId: string, checked: boolean) => {
        setSelectedQuizIds(prev =>
            checked ? [...prev, quizId] : prev.filter(id => id !== quizId)
        );
    };

    const getGroupsDisplay = (quiz: SerializableQuiz) => {
        const assignedGroups = groups.filter(g => quiz.assignedGroupIds?.includes(g.id));
        if (assignedGroups.length === 0) return null;
        
        const firstGroup = assignedGroups[0];
        const remainingCount = assignedGroups.length - 1;
        
        return {
            display: remainingCount > 0 ? `${firstGroup.name} +${remainingCount}` : firstGroup.name,
            allGroups: assignedGroups.map(g => g.name).join(', ')
        };
    };

    return (
        <TooltipProvider>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>All Quizzes</CardTitle>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search quizzes..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 w-64"
                                />
                            </div>
                            {selectedQuizIds.length > 0 && (
                                <Button onClick={() => setIsBulkDialogOpen(true)}>
                                    <Users className="mr-2 h-4 w-4" />
                                    Bulk Assign ({selectedQuizIds.length})
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Pagination
                        total={filteredQuizzes.length}
                        page={page}
                        pageSize={pageSize}
                        onPageChange={(p) => setPage(Math.max(1, Math.min(Math.ceil(filteredQuizzes.length / pageSize) || 1, p)))}
                        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                    />
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={selectedQuizIds.length === filteredQuizzes.length && filteredQuizzes.length > 0}
                                        onCheckedChange={handleSelectAllQuizzes}
                                    />
                                </TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>
                                    <button 
                                        onClick={() => setQuestionsSortOrder(prev => 
                                            prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'
                                        )}
                                        className="flex items-center gap-1 hover:text-foreground"
                                    >
                                        Questions
                                        {questionsSortOrder === 'asc' && <span>↑</span>}
                                        {questionsSortOrder === 'desc' && <span>↓</span>}
                                        {!questionsSortOrder && <span className="text-muted-foreground">↕</span>}
                                    </button>
                                </TableHead>
                                <TableHead>Groups</TableHead>
                                <TableHead>Visibility</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                            <TableRow>
                                <TableHead></TableHead>
                                <TableHead>
                                    <Input
                                        placeholder="Filter title..."
                                        value={titleFilter}
                                        onChange={(e) => setTitleFilter(e.target.value)}
                                        className="h-8"
                                    />
                                </TableHead>
                                <TableHead>
                                    <Input
                                        placeholder="Filter category..."
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className="h-8"
                                    />
                                </TableHead>
                                <TableHead>
                                    <Input
                                        placeholder="# questions"
                                        value={questionsFilter}
                                        onChange={(e) => setQuestionsFilter(e.target.value)}
                                        className="h-8"
                                        type="number"
                                    />
                                </TableHead>
                                <TableHead>
                                    <Input
                                        placeholder="Filter groups..."
                                        value={groupsFilter}
                                        onChange={(e) => setGroupsFilter(e.target.value)}
                                        className="h-8"
                                    />
                                </TableHead>
                                <TableHead>
                                    <select
                                        value={visibilityFilter}
                                        onChange={(e) => setVisibilityFilter(e.target.value)}
                                        className="h-8 w-full rounded border border-input bg-background px-3 py-1 text-sm"
                                    >
                                        <option value="">All</option>
                                        <option value="public">Public</option>
                                        <option value="private">Private</option>
                                    </select>
                                </TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredQuizzes.slice((page - 1) * pageSize, page * pageSize).map((quiz) => {
                                const groupsDisplay = getGroupsDisplay(quiz);
                                return (
                                    <TableRow key={quiz.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedQuizIds.includes(quiz.id)}
                                                onCheckedChange={(checked) => handleQuizSelect(quiz.id, checked as boolean)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{quiz.title}</TableCell>
                                        <TableCell>{quiz.category}</TableCell>
                                        <TableCell>{quiz.questionIds.length}</TableCell>
                                        <TableCell>
                                            {groupsDisplay ? (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Badge variant="outline" className="cursor-help">
                                                            {groupsDisplay.display}
                                                        </Badge>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{groupsDisplay.allGroups}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">No groups</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={quiz.isPublic ? "default" : "secondary"}>
                                                {quiz.isPublic ? "Public" : "Private"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/admin/quizzes/${quiz.id}/edit`}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => handleAssignClick(quiz)}>
                                                    <UserPlus className="mr-2 h-4 w-4" />
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => handleExternalAssignClick(quiz)}>
                                                    <Share2 className="h-4 w-4" />
                                                </Button>
                                                <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(quiz)}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
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

            <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Bulk Assign Quizzes</DialogTitle>
                        <DialogDescription>
                            Assign {selectedQuizIds.length} selected quizzes to groups.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2">Selected Quizzes ({selectedQuizIds.length}):</h4>
                            <div className="text-sm text-muted-foreground max-h-20 overflow-y-auto">
                                {selectedQuizIds.map(id => {
                                    const quiz = quizzes.find(q => q.id === id);
                                    return <div key={id}>• {quiz?.title}</div>;
                                })}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium mb-2">Assign to Groups:</h4>
                            <ScrollArea className="h-48 w-full rounded-md border p-4">
                                {groups.map((group) => (
                                    <div key={group.id} className="flex items-center space-x-2 mb-2">
                                        <Checkbox
                                            checked={selectedGroupIds.includes(group.id)}
                                            onCheckedChange={(checked) => {
                                                setSelectedGroupIds(prev =>
                                                    checked
                                                        ? [...prev, group.id]
                                                        : prev.filter(id => id !== group.id)
                                                );
                                            }}
                                        />
                                        <label className="text-sm font-medium leading-none">
                                            {group.name} ({group.memberIds?.length || 0} members)
                                        </label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => setIsBulkDialogOpen(false)}>Cancel</Button>
                        <Button
                            type="submit"
                            onClick={handleBulkAssign}
                            disabled={isSubmitting || selectedGroupIds.length === 0}
                        >
                            {isSubmitting ? "Assigning..." : `Assign to ${selectedGroupIds.length} Groups`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you sure you want to delete this quiz?</DialogTitle>
                        <DialogDescription>
                            This will permanently delete the quiz "{selectedQuiz?.title}" and all of its associated questions. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isSubmitting}>
                            {isSubmitting ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* External Assignment Dialog */}
            <Dialog open={isExternalDialogOpen} onOpenChange={setIsExternalDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Assign to External Candidate</DialogTitle>
                        <DialogDescription>
                            Generate a unique link to share with an external candidate for the quiz: "{selectedQuiz?.title}".
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {generatedLink ? (
                            <div className="space-y-3">
                                <p className="text-sm text-muted-foreground">Share this link with the candidate:</p>
                                <Input
                                    readOnly
                                    value={generatedLink}
                                    className="text-sm"
                                />
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        navigator.clipboard.writeText(generatedLink);
                                        toast({ title: "Copied to clipboard!" });
                                    }}
                                >
                                    Copy Link
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <label htmlFor="name" className="text-sm font-medium">Candidate Name</label>
                                    <Input
                                        id="name"
                                        placeholder="e.g., Jane Doe"
                                        value={externalCandidateName}
                                        onChange={(e) => setExternalCandidateName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-medium">Candidate Email</label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="e.g., jane.doe@example.com"
                                        value={externalCandidateEmail}
                                        onChange={(e) => setExternalCandidateEmail(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="expiresAt" className="text-sm font-medium">Expires At</label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !expiresAt && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {expiresAt ? format(expiresAt, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={expiresAt}
                                                onSelect={setExpiresAt}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </>
                        )}
                    </div>
                    {!generatedLink && (
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => setIsExternalDialogOpen(false)}>Cancel</Button>
                            <Button
                                type="submit"
                                onClick={handleGenerateLink}
                                disabled={isSubmitting || !externalCandidateName || !externalCandidateEmail || !expiresAt}
                            >
                                {isSubmitting ? "Generating..." : "Generate Link"}
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
}
