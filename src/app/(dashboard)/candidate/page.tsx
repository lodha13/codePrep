"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Quiz } from "@/types/schema";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Book, Clock, LayoutDashboard, LogOut } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function CandidateDashboard() {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const { user, signOut } = useAuth();

    useEffect(() => {
        const fetchQuizzes = async () => {
            setLoading(true);
            const q = query(collection(db, "quizzes"), where("isPublic", "==", true));
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Quiz));
            setQuizzes(list);
            setLoading(false);
        };
        fetchQuizzes();
    }, []);

    const getInitials = (name?: string) => {
        if (!name) return "U";
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    return (
        <div className="min-h-screen bg-secondary/50 font-body">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
                <h1 className="text-xl font-bold font-headline">Candidate Dashboard</h1>
                <div className="relative ml-auto flex-1 md:grow-0">
                    {/* Search can go here */}
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="overflow-hidden rounded-full"
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
                        <DropdownMenuItem>
                            <Link href="/profile" className="flex items-center">
                                <LayoutDashboard className="mr-2 h-4 w-4" /> Profile
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => signOut()}>
                            <LogOut className="mr-2 h-4 w-4" /> Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>

            <main className="p-8">
                 <div className="mb-8">
                    <h2 className="text-3xl font-bold font-headline">Welcome, {user?.displayName || "Candidate"}!</h2>
                    <p className="text-muted-foreground">Here are the assessments available for you.</p>
                </div>
                
                {loading ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => (
                             <Card key={i} className="flex flex-col bg-background/50 animate-pulse">
                                <CardHeader>
                                    <div className="h-6 w-3/4 bg-muted rounded"></div>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-2">
                                     <div className="h-4 w-full bg-muted rounded"></div>
                                     <div className="h-4 w-1/2 bg-muted rounded"></div>
                                </CardContent>
                                <CardFooter>
                                    <div className="h-10 w-full bg-muted rounded-md"></div>
                                </CardFooter>
                            </Card>
                        ))}
                     </div>
                ) : quizzes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-20 border-2 border-dashed rounded-lg">
                        <h3 className="text-2xl font-bold font-headline">No Quizzes Available</h3>
                        <p className="text-muted-foreground mt-2">Please check back later for assigned quizzes.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {quizzes.map(quiz => (
                            <Card key={quiz.id} className="hover:shadow-lg transition-shadow flex flex-col bg-background/50">
                                <CardHeader>
                                    <CardTitle className="font-headline">{quiz.title}</CardTitle>
                                    <CardDescription>{quiz.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <div className="text-sm text-muted-foreground space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Book className="h-4 w-4" />
                                            <span>{quiz.questionIds?.length || 0} Questions</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            <span>{quiz.durationMinutes} minutes</span>
                                        </div>
                                        <span className="inline-block bg-primary/10 text-primary text-xs px-2 py-1 rounded-full mt-2 uppercase font-semibold">{quiz.category || "General"}</span>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button asChild className="w-full">
                                        <Link href={`/quiz/${quiz.id}`}>Start Quiz</Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}