
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Quiz } from "@/types/schema";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Search, Code, CheckSquare, Square } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CandidateDashboard() {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const { user, signOut } = useAuth();

    useEffect(() => {
        const fetchQuizzes = async () => {
            if (!user) {
                setLoading(false);
                return;
            };

            setLoading(true);

            // Fetch all public quizzes
            const quizzesQuery = query(collection(db, "quizzes"), where("isPublic", "==", true));
            const quizzesSnapshot = await getDocs(quizzesQuery);
            const allPublicQuizzes = quizzesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Quiz));
            
            // Use the completedQuizIds from the user object in context
            const completedQuizIds = user.completedQuizIds || [];
            
            // Filter out the quizzes that have already been completed
            const availableQuizzes = allPublicQuizzes.filter(quiz => !completedQuizIds.includes(quiz.id));

            setQuizzes(availableQuizzes);
            setLoading(false);
        };

        if (user) {
            fetchQuizzes();
        }
    }, [user]);

    const getInitials = (name?: string) => {
        if (!name) return "U";
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    return (
        <div className="min-h-screen bg-background font-body">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-white px-4 md:px-6">
                <div className="flex items-center gap-8">
                     <Link href="/" className="flex items-center gap-2 font-bold text-lg">
                        <Code className="h-6 w-6 text-primary" />
                        CodePrep Pro
                    </Link>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                        <Link href="#" className="text-foreground transition-colors hover:text-foreground/80">Prepare</Link>
                        <Link href="#" className="text-muted-foreground transition-colors hover:text-foreground/80">Certify</Link>
                        <Link href="#" className="text-muted-foreground transition-colors hover:text-foreground/80">Compete</Link>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                     <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search..." className="pl-9" />
                    </div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="overflow-hidden rounded-full h-9 w-9"
                            >
                                <Avatar>
                                    <AvatarImage src={user?.photoURL || ''} alt="Avatar" />
                                    <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{user?.displayName || "My Account"}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => signOut()}>
                                <LogOut className="mr-2 h-4 w-4" /> Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            <main className="p-4 md:p-8 lg:p-12">
                 <div className="mb-8">
                    <p className="text-sm text-muted-foreground">Prepare &gt; Java</p>
                    <h1 className="text-4xl font-bold font-headline mt-1">Java</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-9">
                        <div className="space-y-4">
                             {loading ? (
                                <>
                                    <Card className="h-24 animate-pulse"></Card>
                                    <Card className="h-24 animate-pulse"></Card>
                                    <Card className="h-24 animate-pulse"></Card>
                                </>
                            ) : quizzes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-center py-20 border-2 border-dashed rounded-lg">
                                    <h3 className="text-2xl font-bold font-headline">No Quizzes Available</h3>
                                    <p className="text-muted-foreground mt-2">You've completed all available quizzes. Please check back later!</p>
                                </div>
                            ) : (
                                quizzes.map(quiz => (
                                    <Card key={quiz.id} className="hover:shadow-md transition-shadow">
                                        <CardContent className="flex items-center justify-between p-6">
                                            <div>
                                                <h3 className="text-lg font-semibold">{quiz.title}</h3>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    <span>{quiz.difficulty || 'Easy'}</span> • <span>Max Score: {quiz.questionIds.length * 10}</span>
                                                </p>
                                            </div>
                                            <Button asChild variant="outline">
                                                <Link href={`/quiz/${quiz.id}`}>Solve Challenge</Link>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <aside className="lg:col-span-3">
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-4">Status</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center">
                                        <CheckSquare className="h-4 w-4 text-muted-foreground mr-2" />
                                        <Label>Solved</Label>
                                    </div>
                                    <div className="flex items-center">
                                        <Square className="h-4 w-4 text-muted-foreground mr-2" />
                                        <Label>Unsolved</Label>
                                    </div>
                                </div>
                            </div>
                             <div>
                                <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-4">Skills</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center">
                                        <Square className="h-4 w-4 text-muted-foreground mr-2" />
                                        <Label>Java (Basic)</Label>
                                    </div>
                                     <div className="flex items-center">
                                        <Square className="h-4 w-4 text-muted-foreground mr-2" />
                                        <Label>Java (Intermediate)</Label>
                                    </div>
                                     <div className="flex items-center">
                                        <Square className="h-4 w-4 text-muted-foreground mr-2" />
                                        <Label>Problem Solving (Intermediate)</Label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>

            </main>
        </div>
    );
}
