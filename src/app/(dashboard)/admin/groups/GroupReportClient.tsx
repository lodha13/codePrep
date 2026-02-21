"use client";

import { useState, useMemo } from "react";
import { Group, User } from "@/types/schema";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Search, Users, Eye } from "lucide-react";

interface GroupReportClientProps {
    groups: Group[];
    users: User[];
    quizzes?: any[];
    results?: any[];
    onViewUser?: (user: User) => void;
}

export function GroupReportClient({ groups, users, quizzes = [], results = [], onViewUser }: GroupReportClientProps) {
    const [selectedGroupId, setSelectedGroupId] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState("");

    const selectedGroup = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);

    // Filter users belonging to the selected group
    const groupUsers = useMemo(() => {
        if (!selectedGroupId) return [];
        
        return users.filter(user => {
            const userId = (user as any).id || (user as any).uid;
            const isInGroupMembers = selectedGroup?.memberIds?.includes(userId);
            const hasGroupId = (user as any).groupIds?.includes(selectedGroupId);
            return isInGroupMembers || hasGroupId;
        });
    }, [selectedGroupId, users, selectedGroup]);

    // Filter displayed users based on search term
    const filteredUsers = useMemo(() => {
        return groupUsers.filter(user => 
            user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [groupUsers, searchTerm]);

    const getUserStats = (u: User) => {
        const publicQuizIds = quizzes.filter(q => q.isPublic).map(q => q.id);
        const assignedQuizIds = (u as any).assignedQuizIds || [];
        const allAvailable = [...new Set([...publicQuizIds, ...assignedQuizIds])];
        const uid = (u as any).id || (u as any).uid;

        // completed quiz ids detected on the user or via results
        const completedIds = Array.from(new Set([
            ...((u as any).completedQuizIds || []),
            ...(results ? results.filter(r => r.userId === uid).map(r => r.quizId) : [])
        ]));

        const completedCount = completedIds.filter((id: string) => allAvailable.includes(id)).length;
        const total = allAvailable.length;
        const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;

        // Score calculation: sum of obtained marks vs sum of total marks for completed quizzes
        const completedResults = results ? results.filter(r => r.userId === uid && completedIds.includes(r.quizId)) : [];
        const obtained = completedResults.reduce((s, r) => s + (r.score || 0), 0);
        const totalMarks = completedResults.reduce((s, r) => s + (r.totalScore || 0), 0);
        const scorePercent = totalMarks > 0 ? Math.round((obtained / totalMarks) * 100) : 0;

        return { completedCount, total, progress, obtained, totalMarks, scorePercent };
    };

    const handleExport = () => {
        if (!selectedGroup) return;
        const csvContent = [
            ["Name", "Email", "Role", "Joined Date", "Completed", "TotalQuizzes", "MarksObtained", "MarksTotal", "Score%"],
            ...filteredUsers.map(u => {
                const publicQuizIds = quizzes.filter(q => q.isPublic).map(q => q.id);
                const assignedQuizIds = (u as any).assignedQuizIds || [];
                const allAvailable = [...new Set([...publicQuizIds, ...assignedQuizIds])];
                const uid = (u as any).id || (u as any).uid;
                const completedIds = Array.from(new Set([...(u as any).completedQuizIds || [], ...(results ? results.filter(r => r.userId === uid).map(r => r.quizId) : [])]));
                const completedCount = completedIds.filter((id: string) => allAvailable.includes(id)).length;
                const total = allAvailable.length;
                const completedResults = results ? results.filter(r => r.userId === uid && completedIds.includes(r.quizId)) : [];
                const obtained = completedResults.reduce((s, r) => s + (r.score || 0), 0);
                const totalMarks = completedResults.reduce((s, r) => s + (r.totalScore || 0), 0);
                const scorePercent = totalMarks > 0 ? Math.round((obtained / totalMarks) * 100) : 0;
                return [
                    (u as any).displayName || "",
                    (u as any).email || "",
                    (u as any).role || "candidate",
                    (u as any).createdAt ? new Date((u as any).createdAt).toLocaleDateString() : "",
                    String(completedCount),
                    String(total),
                    String(obtained),
                    String(totalMarks),
                    String(scorePercent)
                ];
            })
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${selectedGroup.name.replace(/\s+/g, '_')}_report.csv`;
        link.click();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Group Report</h1>
                    <p className="text-muted-foreground">View and export user lists by group.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="w-full md:w-[300px]">
                        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a group..." />
                            </SelectTrigger>
                            <SelectContent>
                                {groups.map((group) => (
                                    <SelectItem key={group.id} value={group.id}>
                                        {group.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="relative flex-1 md:flex-none">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users in this group..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 w-full md:w-[320px]"
                        />
                    </div>

                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {selectedGroupId && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            {selectedGroup?.name} Members 
                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                                ({filteredUsers.length} users)
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Rank</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead>Quizzes</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            {searchTerm ? "No users match your search." : "No users found in this group."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    (() => {
                                        const ranked = filteredUsers.map(u => ({ user: u, stats: getUserStats(u) }));
                                        ranked.sort((a, b) => (b.stats.scorePercent || 0) - (a.stats.scorePercent || 0));
                                        return ranked.map((row, idx) => (
                                            <TableRow key={(row.user as any).id || (row.user as any).uid}>
                                                <TableCell>
                                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                                                        {idx + 1}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{row.user.displayName}</p>
                                                        <p className="text-sm text-muted-foreground">{row.user.email}</p>
                                                    </div>
                                                </TableCell>
                                                        <TableCell>
                                                            <div className="text-right">
                                                                <p className="font-bold text-lg">{row.stats.scorePercent}%</p>
                                                                <p className="text-xs text-muted-foreground">{row.stats.obtained}/{row.stats.totalMarks} pts</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{row.stats.completedCount}/{row.stats.total}</Badge>
                                                        </TableCell>
                                                <TableCell>
                                                    <Button variant="outline" size="sm" onClick={() => onViewUser?.(row.user)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ));
                                    })()
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}