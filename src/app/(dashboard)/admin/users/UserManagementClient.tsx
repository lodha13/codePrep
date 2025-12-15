
'use client';

import { useState, useEffect } from 'react';
import { User, UserRole, QuizResult } from '@/types/schema';
import { updateUserRole } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Eye, Trophy, Calendar, AlertTriangle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Link from 'next/link';


interface UserManagementClientProps {
    initialUsers: User[];
}

export function UserManagementClient({ initialUsers }: UserManagementClientProps) {
    const [users, setUsers] = useState(initialUsers);
    const [filteredUsers, setFilteredUsers] = useState(initialUsers);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userResults, setUserResults] = useState<QuizResult[]>([]);
    const [loadingResults, setLoadingResults] = useState(false);
    const [allQuizzes, setAllQuizzes] = useState<any[]>([]);
    const [userQuizStats, setUserQuizStats] = useState<any>(null);

    useEffect(() => {
        const filtered = users.filter(user => 
            user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredUsers(filtered);
    }, [users, searchTerm]);

    const handleRoleChange = async (uid: string, newRole: UserRole) => {
        setLoading(prev => ({ ...prev, [uid]: true }));
        const result = await updateUserRole(uid, newRole);
        if (result.success) {
            setUsers(prevUsers =>
                prevUsers.map(u => (u.uid === uid ? { ...u, role: newRole } : u))
            );
        } else {
            console.error(result.message);
        }
        setLoading(prev => ({ ...prev, [uid]: false }));
    };

    const fetchUserResults = async (userId: string) => {
        setLoadingResults(true);
        try {
            // Fetch user results
            const resultsQuery = query(
                collection(db, 'results'),
                where('userId', '==', userId),
                where('status', '==', 'completed')
            );
            const resultsSnap = await getDocs(resultsQuery);
            const results = resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizResult));
            setUserResults(results);

            // Fetch all quizzes if not already fetched
            if (allQuizzes.length === 0) {
                const quizzesSnap = await getDocs(collection(db, 'quizzes'));
                const quizzes = quizzesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllQuizzes(quizzes);
            }
        } catch (error) {
            console.error('Error fetching user results:', error);
        } finally {
            setLoadingResults(false);
        }
    };

    const handleViewUser = (user: User) => {
        setSelectedUser(user);
        fetchUserResults(user.uid);
        calculateUserQuizStats(user);
    };

    const calculateUserQuizStats = async (user: User) => {
        try {
            // Fetch all quizzes if not already available
            let quizzes = allQuizzes;
            if (quizzes.length === 0) {
                const quizzesSnap = await getDocs(collection(db, 'quizzes'));
                quizzes = quizzesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllQuizzes(quizzes);
            }

            // Get public quiz IDs
            const publicQuizIds = quizzes.filter(q => q.isPublic).map(q => q.id);
            
            // Get assigned quiz IDs
            const assignedQuizIds = user.assignedQuizIds || [];
            
            // Combine and deduplicate (public + assigned)
            const allAvailableQuizIds = [...new Set([...publicQuizIds, ...assignedQuizIds])];
            
            // Get completed quiz IDs
            const completedQuizIds = user.completedQuizIds || [];
            
            // Calculate pending quizzes
            const pendingQuizIds = allAvailableQuizIds.filter(quizId => !completedQuizIds.includes(quizId));
            
            // Get quiz titles for pending quizzes
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
        } catch (error) {
            console.error('Error calculating quiz stats:', error);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        return timestamp.toDate ? timestamp.toDate().toLocaleDateString() : new Date(timestamp).toLocaleDateString();
    };

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Current Role</TableHead>
                                <TableHead className="w-[180px]">Change Role</TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.map((user) => (
                                <TableRow key={user.uid}>
                                    <TableCell className="font-medium">{user.displayName || 'N/A'}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'admin' ? 'destructive' : 'default'}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            defaultValue={user.role}
                                            onValueChange={(value) => handleRoleChange(user.uid, value as UserRole)}
                                            disabled={loading[user.uid]}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="candidate">Candidate</SelectItem>
                                                <SelectItem value="admin">Admin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        {user.role === 'candidate' && (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleViewUser(user)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                                    <DialogHeader>
                                                        <DialogTitle>Candidate Details: {user.displayName || user.email}</DialogTitle>
                                                    </DialogHeader>
                                                    {selectedUser?.uid === user.uid && (
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
                                                                            <p className="text-sm text-muted-foreground">{user.displayName || 'N/A'}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-medium">Email</p>
                                                                            <p className="text-sm text-muted-foreground">{user.email}</p>
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
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
