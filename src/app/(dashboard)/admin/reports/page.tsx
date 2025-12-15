"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Users, Trophy, AlertTriangle, Eye, Search, Calendar } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface User {
    id: string;
    email: string;
    displayName: string;
    role: string;
    assignedQuizIds?: string[];
    completedQuizIds?: string[];
    onBench?: boolean;
    createdAt?: any;
}

interface Quiz {
    id: string;
    title: string;
    isPublic: boolean;
}

interface QuizResult {
    id: string;
    userId: string;
    quizId: string;
    score: number;
    totalScore: number;
    userEmail?: string;
    userName?: string;
    quizTitle?: string;
}

export default function ReportsPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [results, setResults] = useState<QuizResult[]>([]);
    const [incompleteUsers, setIncompleteUsers] = useState<any[]>([]);
    const [rankings, setRankings] = useState<any[]>([]);
    const [selectedQuiz, setSelectedQuiz] = useState<string>("all");
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userResults, setUserResults] = useState<QuizResult[]>([]);
    const [loadingResults, setLoadingResults] = useState(false);
    const [userQuizStats, setUserQuizStats] = useState<any>(null);
    const [showOnBenchOnly, setShowOnBenchOnly] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (users.length && quizzes.length && results.length) {
            generateIncompleteReport();
            generateRankings();
        }
    }, [users, quizzes, results, selectedQuiz, showOnBenchOnly]);

    const fetchUserResults = async (userId: string) => {
        setLoadingResults(true);
        try {
            const userResultsForUser = results.filter(r => r.userId === userId);
            setUserResults(userResultsForUser);
        } catch (error) {
            console.error('Error fetching user results:', error);
        } finally {
            setLoadingResults(false);
        }
    };

    const calculateUserQuizStats = (user: User) => {
        const publicQuizIds = quizzes.filter(q => q.isPublic).map(q => q.id);
        const assignedQuizIds = user.assignedQuizIds || [];
        const allAvailableQuizIds = [...new Set([...publicQuizIds, ...assignedQuizIds])];
        const completedQuizIds = user.completedQuizIds || [];
        const pendingQuizIds = allAvailableQuizIds.filter(quizId => !completedQuizIds.includes(quizId));
        
        const pendingQuizzes = pendingQuizIds.map(quizId => {
            const quiz = quizzes.find(q => q.id === quizId);
            return quiz ? { id: quizId, title: quiz.title } : { id: quizId, title: 'Unknown Quiz' };
        });

        setUserQuizStats({
            totalAssigned: allAvailableQuizIds.length,
            totalCompleted: completedQuizIds.length,
            pendingCount: pendingQuizIds.length,
            pendingQuizzes: pendingQuizzes
        });
    };

    const handleViewUser = (user: User) => {
        setSelectedUser(user);
        fetchUserResults(user.id);
        calculateUserQuizStats(user);
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        return timestamp.toDate ? timestamp.toDate().toLocaleDateString() : new Date(timestamp).toLocaleDateString();
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch users
            const usersSnap = await getDocs(collection(db, "users"));
            const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setUsers(usersData);

            // Fetch quizzes
            const quizzesSnap = await getDocs(collection(db, "quizzes"));
            const quizzesData = quizzesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));
            setQuizzes(quizzesData);

            // Fetch results
            const resultsSnap = await getDocs(query(collection(db, "results"), where("status", "==", "completed")));
            const resultsData = resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizResult));
            setResults(resultsData);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const generateIncompleteReport = () => {
        let candidates = users.filter(user => user.role === "candidate");
        
        // Filter by onBench status if enabled
        if (showOnBenchOnly) {
            candidates = candidates.filter(user => user.onBench === true);
        }
        
        const incomplete = candidates.map(user => {
            // Get public quiz IDs
            const publicQuizIds = quizzes.filter(q => q.isPublic).map(q => q.id);
            // Get assigned quiz IDs
            const assignedQuizIds = user.assignedQuizIds || [];
            // Combine and deduplicate
            const allAvailableQuizIds = [...new Set([...publicQuizIds, ...assignedQuizIds])];
            const completedQuizzes = user.completedQuizIds || [];
            const incompleteQuizzes = allAvailableQuizIds.filter(quizId => !completedQuizzes.includes(quizId));
            
            // Calculate average score from results
            const userResultsForUser = results.filter(r => r.userId === user.id);
            const avgScore = userResultsForUser.length > 0 
                ? userResultsForUser.reduce((sum, r) => sum + (r.totalScore > 0 ? (r.score / r.totalScore) * 100 : 0), 0) / userResultsForUser.length
                : 0;
            
            // Calculate bench age in days
            let benchAge = 0;
            if (user.createdAt) {
                const createdDate = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
                const today = new Date();
                const diffTime = today.getTime() - createdDate.getTime();
                benchAge = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                // Ensure non-negative
                benchAge = Math.max(0, benchAge);
            }
            
            return {
                user,
                userId: user.id,
                userName: user.displayName || user.email,
                userEmail: user.email,
                totalAssigned: allAvailableQuizIds.length,
                totalCompleted: completedQuizzes.length,
                incompleteCount: incompleteQuizzes.length,
                avgScore: Math.round(avgScore),
                progressPercentage: allAvailableQuizIds.length > 0 ? Math.round((completedQuizzes.length / allAvailableQuizIds.length) * 100) : 0,
                benchAge: benchAge,
                createdDate: user.createdAt,
                incompleteQuizzes: incompleteQuizzes.map(quizId => {
                    const quiz = quizzes.find(q => q.id === quizId);
                    return quiz ? quiz.title : "Unknown Quiz";
                })
            };
        }).sort((a, b) => b.avgScore - a.avgScore); // Sort by average score descending

        setIncompleteUsers(incomplete);
    };

    const generateRankings = () => {
        let filteredResults = results;
        
        if (selectedQuiz === "public") {
            const publicQuizIds = quizzes.filter(q => q.isPublic).map(q => q.id);
            filteredResults = results.filter(result => publicQuizIds.includes(result.quizId));
        } else if (selectedQuiz !== "all") {
            filteredResults = results.filter(result => result.quizId === selectedQuiz);
        }

        // Group results by user and calculate total scores
        const userScores = new Map();
        
        filteredResults.forEach(result => {
            const user = users.find(u => u.id === result.userId);
            if (!user) return;

            const key = result.userId;
            if (!userScores.has(key)) {
                userScores.set(key, {
                    userId: result.userId,
                    userName: user.displayName || user.email,
                    userEmail: user.email,
                    totalScore: 0,
                    maxScore: 0,
                    quizzesCompleted: 0
                });
            }

            const userScore = userScores.get(key);
            userScore.totalScore += result.score || 0;
            userScore.maxScore += result.totalScore || 0;
            userScore.quizzesCompleted += 1;
        });

        // Convert to array and sort by percentage
        const rankingsArray = Array.from(userScores.values())
            .map(user => ({
                ...user,
                percentage: user.maxScore > 0 ? Math.round((user.totalScore / user.maxScore) * 100) : 0
            }))
            .sort((a, b) => b.percentage - a.percentage);

        setRankings(rankingsArray);
    };

    if (loading) {
        return <div className="p-8 text-center">Loading reports...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Reports</h1>
            
            <Tabs defaultValue="assignments" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="assignments">Assignment Progress</TabsTrigger>
                    <TabsTrigger value="rankings">Candidate Rankings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="assignments" className="space-y-6">
                    {/* Incomplete Assignments Report */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Candidate Progress Report
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={showOnBenchOnly}
                                onChange={(e) => setShowOnBenchOnly(e.target.checked)}
                                className="rounded"
                            />
                            <span className="text-sm">Show only bench candidates</span>
                        </label>
                    </div>
                </CardHeader>
                <CardContent>
                    {incompleteUsers.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                            {showOnBenchOnly ? "All bench candidates have completed their assigned quizzes!" : "All candidates have completed their assigned quizzes!"}
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Candidate</TableHead>
                                    <TableHead>Bench Age</TableHead>
                                    <TableHead>Progress</TableHead>
                                    <TableHead>Avg Score</TableHead>
                                    <TableHead>Completed</TableHead>
                                    <TableHead>Pending</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {incompleteUsers.map(userData => (
                                    <TableRow key={userData.userId}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{userData.userName}</p>
                                                <p className="text-sm text-muted-foreground">{userData.userEmail}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {userData.benchAge} days
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                                    <div 
                                                        className="bg-blue-600 h-2 rounded-full" 
                                                        style={{ width: `${userData.progressPercentage}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm">{userData.progressPercentage}%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={userData.avgScore >= 70 ? "default" : "destructive"}>
                                                {userData.avgScore}%
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{userData.totalCompleted}/{userData.totalAssigned}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {userData.incompleteCount}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleViewUser(userData.user)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                                    <DialogHeader>
                                                        <DialogTitle>Candidate Details: {userData.userName}</DialogTitle>
                                                    </DialogHeader>
                                                    {selectedUser?.id === userData.userId && (
                                                        <div className="space-y-6">
                                                            {/* User Info */}
                                                            <Card>
                                                                <CardHeader>
                                                                    <CardTitle className="text-lg">User Information</CardTitle>
                                                                </CardHeader>
                                                                <CardContent>
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div>
                                                                            <p className="text-sm font-medium">Name</p>
                                                                            <p className="text-sm text-muted-foreground">{userData.user.displayName || 'N/A'}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-medium">Email</p>
                                                                            <p className="text-sm text-muted-foreground">{userData.user.email}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-medium">Total Assigned Quizzes</p>
                                                                            <p className="text-sm text-muted-foreground">{userQuizStats?.totalAssigned || 0}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-medium">Completed Quizzes</p>
                                                                            <p className="text-sm text-muted-foreground">{userQuizStats?.totalCompleted || 0}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-medium">Pending Quizzes</p>
                                                                            <p className="text-sm text-muted-foreground">{userQuizStats?.pendingCount || 0}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-medium">Progress</p>
                                                                            <p className="text-sm text-muted-foreground">
                                                                                {userQuizStats?.totalAssigned > 0 
                                                                                    ? Math.round((userQuizStats.totalCompleted / userQuizStats.totalAssigned) * 100)
                                                                                    : 0}% Complete
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>

                                                            {/* Pending Quizzes */}
                                                            {userQuizStats?.pendingQuizzes?.length > 0 && (
                                                                <Card>
                                                                    <CardHeader>
                                                                        <CardTitle className="text-lg flex items-center gap-2">
                                                                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                                                                            Pending Quizzes ({userQuizStats.pendingCount})
                                                                        </CardTitle>
                                                                    </CardHeader>
                                                                    <CardContent>
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                            {userQuizStats.pendingQuizzes.map((quiz: any) => (
                                                                                <div key={quiz.id} className="p-2 bg-orange-50 border border-orange-200 rounded text-sm">
                                                                                    {quiz.title}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </CardContent>
                                                                </Card>
                                                            )}

                                                            {/* Quiz Results */}
                                                            <Card>
                                                                <CardHeader>
                                                                    <CardTitle className="text-lg flex items-center gap-2">
                                                                        <Trophy className="h-5 w-5" />
                                                                        Completed Quiz Results
                                                                    </CardTitle>
                                                                </CardHeader>
                                                                <CardContent>
                                                                    {loadingResults ? (
                                                                        <p className="text-center py-4">Loading results...</p>
                                                                    ) : userResults.length === 0 ? (
                                                                        <p className="text-center py-4 text-muted-foreground">No completed quizzes found.</p>
                                                                    ) : (
                                                                        <div className="space-y-3">
                                                                            {userResults.map((result) => (
                                                                                <div key={result.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                                                    <div>
                                                                                        <h4 className="font-semibold">{result.quizTitle || 'Quiz'}</h4>
                                                                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                                                            <div className="flex items-center gap-1">
                                                                                                <Trophy className="h-4 w-4" />
                                                                                                <span>Score: {Math.round((result.score || 0) * 10) / 10}/{result.totalScore}</span>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-1">
                                                                                                <Calendar className="h-4 w-4" />
                                                                                                <span>Completed: {formatDate(result.completedAt)}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-right">
                                                                                        <div className="text-lg font-bold">
                                                                                            {result.totalScore > 0 ? Math.round((result.score / result.totalScore) * 100) : 0}%
                                                                                        </div>
                                                                                        <Button asChild variant="outline" size="sm">
                                                                                            <Link href={`/results/${result.id}`}>View Details</Link>
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </CardContent>
                                                            </Card>
                                                        </div>
                                                    )}
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    </CardContent>
                </Card>
                </TabsContent>
                
                <TabsContent value="rankings" className="space-y-6">
                    {/* Rankings Report */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        Candidate Rankings
                    </CardTitle>
                    <div className="flex gap-2">
                        <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select quiz" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Quizzes</SelectItem>
                                <SelectItem value="public">Public Quizzes Only</SelectItem>
                                {quizzes.map(quiz => (
                                    <SelectItem key={quiz.id} value={quiz.id}>
                                        {quiz.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {rankings.length === 0 ? (
                        <p className="text-muted-foreground">No results found for the selected criteria.</p>
                    ) : (
                        <div className="space-y-2">
                            {rankings.map((user, index) => (
                                <div key={user.userId} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-semibold">{user.userName}</p>
                                            <p className="text-sm text-muted-foreground">{user.userEmail}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-lg">{user.percentage}%</p>
                                        <p className="text-sm text-muted-foreground">
                                            {Math.round(user.totalScore * 10) / 10}/{user.maxScore} pts ({user.quizzesCompleted} quizzes)
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    </CardContent>
                </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}