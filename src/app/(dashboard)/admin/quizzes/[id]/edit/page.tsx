"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Quiz, Group, User } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { getGroups } from "@/lib/admin-utils";
import { getUsers } from "../../../actions";

export default function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [groups, setGroups] = useState<Group[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const loadData = async () => {
            try {
                const [quizDoc, groupsData, usersData] = await Promise.all([
                    getDoc(doc(db, "quizzes", resolvedParams.id)),
                    getGroups(),
                    getUsers()
                ]);

                if (quizDoc.exists()) {
                    setQuiz({ id: quizDoc.id, ...quizDoc.data() } as Quiz);
                }
                setGroups(groupsData);
                setUsers(usersData.filter(u => u.role === 'candidate'));
            } catch (error) {
                toast({ variant: "destructive", title: "Error loading quiz" });
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [resolvedParams.id, toast]);

    const handleSave = async () => {
        if (!quiz) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, "quizzes", quiz.id), {
                title: quiz.title,
                description: quiz.description,
                isPublic: quiz.isPublic,
                assignedUserIds: quiz.assignedUserIds || [],
                assignedGroupIds: quiz.assignedGroupIds || []
            });
            toast({ title: "Quiz updated successfully" });
            router.back();
        } catch (error) {
            toast({ variant: "destructive", title: "Error updating quiz" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!quiz) return <div>Quiz not found</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Edit Quiz</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Quiz Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={quiz.title}
                                onChange={(e) => setQuiz({...quiz, title: e.target.value})}
                            />
                        </div>
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={quiz.description || ""}
                                onChange={(e) => setQuiz({...quiz, description: e.target.value})}
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="isPublic"
                                checked={quiz.isPublic}
                                onCheckedChange={(checked) => setQuiz({...quiz, isPublic: checked})}
                            />
                            <Label htmlFor="isPublic">Public Quiz</Label>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Assignments</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Assigned Groups</Label>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                                {groups.map(group => (
                                    <div key={group.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            checked={quiz.assignedGroupIds?.includes(group.id) || false}
                                            onCheckedChange={(checked) => {
                                                const groupIds = quiz.assignedGroupIds || [];
                                                setQuiz({
                                                    ...quiz,
                                                    assignedGroupIds: checked 
                                                        ? [...groupIds, group.id]
                                                        : groupIds.filter(id => id !== group.id)
                                                });
                                            }}
                                        />
                                        <Label className="text-sm">{group.name}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <Label>Assigned Users</Label>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                                {users.map(user => (
                                    <div key={user.uid} className="flex items-center space-x-2">
                                        <Checkbox
                                            checked={quiz.assignedUserIds?.includes(user.uid) || false}
                                            onCheckedChange={(checked) => {
                                                const userIds = quiz.assignedUserIds || [];
                                                setQuiz({
                                                    ...quiz,
                                                    assignedUserIds: checked 
                                                        ? [...userIds, user.uid]
                                                        : userIds.filter(id => id !== user.uid)
                                                });
                                            }}
                                        />
                                        <Label className="text-sm">{user.displayName}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}