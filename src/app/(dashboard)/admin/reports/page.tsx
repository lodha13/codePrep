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
import Pagination from '@/components/ui/pagination';

interface User {
    id: string;
    email: string;
    displayName: string;
    role: string;
    assignedQuizIds?: string[];
    completedQuizIds?: string[];
    isBench?: boolean;
    createdAt?: any;
    primarySkill?: string;
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
    const [nameFilter, setNameFilter] = useState<string>("");
    const [skillFilter, setSkillFilter] = useState<string>("");
    const [availableSkills, setAvailableSkills] = useState<string[]>([]);
    const [rankingNameFilter, setRankingNameFilter] = useState<string>("");
    const [rankingSkillFilter, setRankingSkillFilter] = useState<string>("");
    const [sortBy, setSortBy] = useState<string>("percentage");
    const [sortOrder, setSortOrder] = useState<string>("desc");
    const [assignmentSortBy, setAssignmentSortBy] = useState<string>("avgScore");
    const [assignmentSortOrder, setAssignmentSortOrder] = useState<string>("desc");
    const [assignmentsPage, setAssignmentsPage] = useState(1);
    const [assignmentsPageSize, setAssignmentsPageSize] = useState(10);
    const [rankingsPage, setRankingsPage] = useState(1);
    const [rankingsPageSize, setRankingsPageSize] = useState(10);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (users.length && quizzes.length && results.length) {
            // Get unique skills from users
            const skills = [...new Set(users.filter(u => u.primarySkill).map(u => u.primarySkill))].sort();
            setAvailableSkills(['Java', 'React', 'Angular', 'DB', 'QA', ...skills.filter(s => !['Java', 'React', 'Angular', 'DB', 'QA'].includes(s!))]);
            
            generateIncompleteReport();
            generateRankings();
        }
    }, [users, quizzes, results, selectedQuiz, showOnBenchOnly, nameFilter, skillFilter, rankingNameFilter, rankingSkillFilter, sortBy, sortOrder, assignmentSortBy, assignmentSortOrder]);

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
        
        // Filter by isBench status if enabled
        if (showOnBenchOnly) {
            candidates = candidates.filter(user => user.isBench === true);
        }
        
        // Filter by name
        if (nameFilter) {
            candidates = candidates.filter(user => 
                user.displayName?.toLowerCase().includes(nameFilter.toLowerCase()) ||
                user.email.toLowerCase().includes(nameFilter.toLowerCase())
            );
        }
        
        // Filter by skill
        if (skillFilter) {
            candidates = candidates.filter(user => 
                user.primarySkill?.toLowerCase().includes(skillFilter.toLowerCase())
            );
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
                primarySkill: user.primarySkill || 'Not Set',
                incompleteQuizzes: incompleteQuizzes.map(quizId => {
                    const quiz = quizzes.find(q => q.id === quizId);
                    return quiz ? quiz.title : "Unknown Quiz";
                })
            };
        });

        // Sort the array based on current sort settings
        incomplete.sort((a, b) => {
            let aVal, bVal;
            switch (assignmentSortBy) {
                case 'name':
                    aVal = a.userName.toLowerCase();
                    bVal = b.userName.toLowerCase();
                    break;
                case 'skill':
                    aVal = a.primarySkill.toLowerCase();
                    bVal = b.primarySkill.toLowerCase();
                    break;
                case 'benchAge':
                    aVal = a.benchAge;
                    bVal = b.benchAge;
                    break;
                case 'progress':
                    aVal = a.progressPercentage;
                    bVal = b.progressPercentage;
                    break;
                case 'avgScore':
                default:
                    aVal = a.avgScore;
                    bVal = b.avgScore;
                    break;
            }
            
            if (assignmentSortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        setIncompleteUsers(incomplete);
        setAssignmentsPage(1);
    };

    const generateRankings = () => {
        // Filter users first (isBench = true)
        let eligibleUsers = users.filter(user => 
            user.role === "candidate" && 
            user.isBench === true
        );
        
        const eligibleUserIds = eligibleUsers.map(u => u.id);
        
        let filteredResults = results.filter(result => eligibleUserIds.includes(result.userId));
        
        if (selectedQuiz === "public") {
            const publicQuizIds = quizzes.filter(q => q.isPublic).map(q => q.id);
            filteredResults = filteredResults.filter(result => publicQuizIds.includes(result.quizId));
        } else if (selectedQuiz !== "all") {
            filteredResults = filteredResults.filter(result => result.quizId === selectedQuiz);
        }

        // Group results by user and calculate total scores
        const userScores = new Map();
        
        filteredResults.forEach(result => {
            const user = users.find(u => u.id === result.userId);
            if (!user) return;

            const key = result.userId;
            if (!userScores.has(key)) {
                userScores.set(key, {
                    user: user,
                    userId: result.userId,
                    userName: user.displayName || user.email,
                    userEmail: user.email,
                    primarySkill: user.primarySkill || 'Not Set',
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

        // Convert to array and add percentage
        let rankingsArray = Array.from(userScores.values())
            .map(user => ({
                ...user,
                percentage: user.maxScore > 0 ? Math.round((user.totalScore / user.maxScore) * 100) : 0
            }));

        // Apply name filter
        if (rankingNameFilter) {
            rankingsArray = rankingsArray.filter(user => 
                user.userName.toLowerCase().includes(rankingNameFilter.toLowerCase()) ||
                user.userEmail.toLowerCase().includes(rankingNameFilter.toLowerCase())
            );
        }
        
        // Apply skill filter
        if (rankingSkillFilter) {
            rankingsArray = rankingsArray.filter(user => 
                user.primarySkill.toLowerCase().includes(rankingSkillFilter.toLowerCase())
            );
        }

        // Sort the array
        rankingsArray.sort((a, b) => {
            let aVal, bVal;
            switch (sortBy) {
                case 'name':
                    aVal = a.userName.toLowerCase();
                    bVal = b.userName.toLowerCase();
                    break;
                case 'skill':
                    aVal = a.primarySkill.toLowerCase();
                    bVal = b.primarySkill.toLowerCase();
                    break;
                case 'percentage':
                default:
                    aVal = a.percentage;
                    bVal = b.percentage;
                    break;
            }
            
            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        // Limit to top 50
        setRankings(rankingsArray.slice(0, 50));
        setRankingsPage(1);
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
                    <Pagination
                        total={incompleteUsers.length}
                        page={assignmentsPage}
                        pageSize={assignmentsPageSize}
                        onPageChange={(p) => setAssignmentsPage(Math.max(1, Math.min(Math.ceil(incompleteUsers.length / assignmentsPageSize) || 1, p)))}
                        onPageSizeChange={(s) => { setAssignmentsPageSize(s); setAssignmentsPage(1); }}
                    />
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1">
                                            <span>Candidate</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    if (assignmentSortBy === 'name') {
                                                        setAssignmentSortOrder(assignmentSortOrder === 'asc' ? 'desc' : 'asc');
                                                    } else {
                                                        setAssignmentSortBy('name');
                                                        setAssignmentSortOrder('asc');
                                                    }
                                                }}
                                                className="h-6 w-6 p-0"
                                            >
                                                {assignmentSortBy === 'name' ? (assignmentSortOrder === 'asc' ? '↑' : '↓') : '↕'}
                                            </Button>
                                        </div>
                                        <Input
                                            placeholder="Filter by name..."
                                            value={nameFilter}
                                            onChange={(e) => setNameFilter(e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                </TableHead>
                                <TableHead>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1">
                                            <span>Primary Skill</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    if (assignmentSortBy === 'skill') {
                                                        setAssignmentSortOrder(assignmentSortOrder === 'asc' ? 'desc' : 'asc');
                                                    } else {
                                                        setAssignmentSortBy('skill');
                                                        setAssignmentSortOrder('asc');
                                                    }
                                                }}
                                                className="h-6 w-6 p-0"
                                            >
                                                {assignmentSortBy === 'skill' ? (assignmentSortOrder === 'asc' ? '↑' : '↓') : '↕'}
                                            </Button>
                                        </div>
                                        <Input
                                            placeholder="Filter by skill..."
                                            value={skillFilter}
                                            onChange={(e) => setSkillFilter(e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                </TableHead>
                                <TableHead>
                                    <div className="flex items-center gap-1">
                                        <span>Bench Age</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                if (assignmentSortBy === 'benchAge') {
                                                    setAssignmentSortOrder(assignmentSortOrder === 'asc' ? 'desc' : 'asc');
                                                } else {
                                                    setAssignmentSortBy('benchAge');
                                                    setAssignmentSortOrder('desc');
                                                }
                                            }}
                                            className="h-6 w-6 p-0"
                                        >
                                            {assignmentSortBy === 'benchAge' ? (assignmentSortOrder === 'asc' ? '↑' : '↓') : '↕'}
                                        </Button>
                                    </div>
                                </TableHead>
                                <TableHead>
                                    <div className="flex items-center gap-1">
                                        <span>Progress</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                if (assignmentSortBy === 'progress') {
                                                    setAssignmentSortOrder(assignmentSortOrder === 'asc' ? 'desc' : 'asc');
                                                } else {
                                                    setAssignmentSortBy('progress');
                                                    setAssignmentSortOrder('desc');
                                                }
                                            }}
                                            className="h-6 w-6 p-0"
                                        >
                                            {assignmentSortBy === 'progress' ? (assignmentSortOrder === 'asc' ? '↑' : '↓') : '↕'}
                                        </Button>
                                    </div>
                                </TableHead>
                                <TableHead>
                                    <div className="flex items-center gap-1">
                                        <span>Avg Score</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                if (assignmentSortBy === 'avgScore') {
                                                    setAssignmentSortOrder(assignmentSortOrder === 'asc' ? 'desc' : 'asc');
                                                } else {
                                                    setAssignmentSortBy('avgScore');
                                                    setAssignmentSortOrder('desc');
                                                }
                                            }}
                                            className="h-6 w-6 p-0"
                                        >
                                            {assignmentSortBy === 'avgScore' ? (assignmentSortOrder === 'asc' ? '↑' : '↓') : '↕'}
                                        </Button>
                                    </div>
                                </TableHead>
                                <TableHead>Completed</TableHead>
                                <TableHead>Pending</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {incompleteUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        {nameFilter || skillFilter 
                                            ? "No candidates match the current filters. Try adjusting your search criteria."
                                            : showOnBenchOnly 
                                                ? "All bench candidates have completed their assigned quizzes!"
                                                : "All candidates have completed their assigned quizzes!"
                                        }
                                    </TableCell>
                                </TableRow>
                            ) : (
                                incompleteUsers.slice((assignmentsPage - 1) * assignmentsPageSize, assignmentsPage * assignmentsPageSize).map(userData => (
                                    <TableRow key={userData.userId}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{userData.userName}</p>
                                                <p className="text-sm text-muted-foreground">{userData.userEmail}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {userData.primarySkill}
                                            </Badge>
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
                                ))
                            )}
                        </TableBody>
                    </Table>
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
                    <Pagination
                        total={rankings.length}
                        page={rankingsPage}
                        pageSize={rankingsPageSize}
                        onPageChange={(p) => setRankingsPage(Math.max(1, Math.min(Math.ceil(rankings.length / rankingsPageSize) || 1, p)))}
                        onPageSizeChange={(s) => { setRankingsPageSize(s); setRankingsPage(1); }}
                    />
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Rank</TableHead>
                                <TableHead>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1">
                                            <span>Candidate</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    if (sortBy === 'name') {
                                                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                    } else {
                                                        setSortBy('name');
                                                        setSortOrder('asc');
                                                    }
                                                }}
                                                className="h-6 w-6 p-0"
                                            >
                                                {sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                                            </Button>
                                        </div>
                                        <Input
                                            placeholder="Filter by name..."
                                            value={rankingNameFilter}
                                            onChange={(e) => setRankingNameFilter(e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                </TableHead>
                                <TableHead>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1">
                                            <span>Primary Skill</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    if (sortBy === 'skill') {
                                                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                    } else {
                                                        setSortBy('skill');
                                                        setSortOrder('asc');
                                                    }
                                                }}
                                                className="h-6 w-6 p-0"
                                            >
                                                {sortBy === 'skill' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                                            </Button>
                                        </div>
                                        <Input
                                            placeholder="Filter by skill..."
                                            value={rankingSkillFilter}
                                            onChange={(e) => setRankingSkillFilter(e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                </TableHead>
                                <TableHead>
                                    <div className="flex items-center gap-1">
                                        <span>Score</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                if (sortBy === 'percentage') {
                                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                } else {
                                                    setSortBy('percentage');
                                                    setSortOrder('desc');
                                                }
                                            }}
                                            className="h-6 w-6 p-0"
                                        >
                                            {sortBy === 'percentage' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                                        </Button>
                                    </div>
                                </TableHead>
                                <TableHead>Quizzes</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rankings.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        {rankingNameFilter || rankingSkillFilter 
                                            ? "No candidates match the current filters. Try adjusting your search criteria."
                                            : "No results found for the selected criteria."
                                        }
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rankings.slice((rankingsPage - 1) * rankingsPageSize, rankingsPage * rankingsPageSize).map((user, index) => (
                                    <TableRow key={user.userId}>
                                        <TableCell>
                                            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                                                {index + 1 + (rankingsPage - 1) * rankingsPageSize}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{user.userName}</p>
                                                <p className="text-sm text-muted-foreground">{user.userEmail}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {user.primarySkill}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-right">
                                                <p className="font-bold text-lg">{user.percentage}%</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {Math.round(user.totalScore * 10) / 10}/{user.maxScore} pts
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {user.quizzesCompleted} completed
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {user.user && (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleViewUser(user.user)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle>Candidate Details: {user.userName}</DialogTitle>
                                                        </DialogHeader>
                                                        {selectedUser?.id === user.userId && (
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
                                                                                <p className="text-sm text-muted-foreground">{user.user.displayName || 'N/A'}</p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-sm font-medium">Email</p>
                                                                                <p className="text-sm text-muted-foreground">{user.user.email}</p>
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
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    </CardContent>
                </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}