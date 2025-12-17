"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User, Group } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { getGroups, assignUsersToGroup, removeUsersFromGroup } from "@/lib/admin-utils";

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const [user, setUser] = useState<User | null>(null);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const loadData = async () => {
            try {
                const [userDoc, groupsData] = await Promise.all([
                    getDoc(doc(db, "users", resolvedParams.id)),
                    getGroups()
                ]);

                if (userDoc.exists()) {
                    setUser({ uid: userDoc.id, ...userDoc.data() } as User);
                }
                setGroups(groupsData);
            } catch (error) {
                toast({ variant: "destructive", title: "Error loading user" });
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [resolvedParams.id, toast]);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            // Update user document
            await updateDoc(doc(db, "users", user.uid), {
                displayName: user.displayName,
                role: user.role,
                isBench: user.isBench,
                groupIds: user.groupIds || []
            });

            // Note: Group membership sync is handled by the admin-utils functions
            // when groups are assigned/removed from the UI

            toast({ title: "User updated successfully" });
            router.back();
        } catch (error) {
            toast({ variant: "destructive", title: "Error updating user" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!user) return <div>User not found</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Edit User</h1>
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
                        <CardTitle>User Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="displayName">Display Name</Label>
                            <Input
                                id="displayName"
                                value={user.displayName || ""}
                                onChange={(e) => setUser({...user, displayName: e.target.value})}
                            />
                        </div>
                        <div>
                            <Label htmlFor="email">Email (Read-only)</Label>
                            <Input id="email" value={user.email} disabled />
                        </div>
                        <div>
                            <Label htmlFor="role">Role</Label>
                            <Select
                                value={user.role}
                                onValueChange={(value) => setUser({...user, role: value as "admin" | "candidate"})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="candidate">Candidate</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="isBench"
                                checked={user.isBench || false}
                                onCheckedChange={(checked) => setUser({...user, isBench: checked})}
                            />
                            <Label htmlFor="isBench">On Bench</Label>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Group Assignments</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Assigned Groups</Label>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {groups.map(group => (
                                    <div key={group.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            checked={user.groupIds?.includes(group.id) || false}
                                            onCheckedChange={(checked) => {
                                                const groupIds = user.groupIds || [];
                                                setUser({
                                                    ...user,
                                                    groupIds: checked 
                                                        ? [...groupIds, group.id]
                                                        : groupIds.filter(id => id !== group.id)
                                                });
                                            }}
                                        />
                                        <Label className="text-sm">{group.name}</Label>
                                        {group.description && (
                                            <span className="text-xs text-muted-foreground">
                                                - {group.description}
                                            </span>
                                        )}
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