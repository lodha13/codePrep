"use client";

import { useState, useEffect } from "react";
import { Group, User } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { createGroup, getGroups, assignUsersToGroup } from "@/lib/admin-utils";
import { getUsers } from "../actions";
import { PlusCircle, Users } from "lucide-react";

export default function GroupsPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupDescription, setNewGroupDescription] = useState("");
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [groupsData, usersData] = await Promise.all([
                getGroups(),
                getUsers()
            ]);
            setGroups(groupsData);
            setUsers(usersData.filter(u => u.role === 'candidate'));
        } catch (error) {
            toast({ variant: "destructive", title: "Error loading data" });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        
        try {
            await createGroup({
                name: newGroupName,
                description: newGroupDescription,
                createdBy: "system", // TODO: Replace with actual admin user ID
                createdAt: new Date(),
                memberIds: []
            });
            
            toast({ title: "Group created successfully" });
            setNewGroupName("");
            setNewGroupDescription("");
            setIsCreateOpen(false);
            loadData();
        } catch (error) {
            toast({ variant: "destructive", title: "Error creating group" });
        }
    };

    const handleAssignUsers = async () => {
        if (!selectedGroup || selectedUserIds.length === 0) return;
        
        try {
            await assignUsersToGroup(selectedGroup.id, selectedUserIds);
            toast({ title: "Users assigned successfully" });
            setIsAssignOpen(false);
            setSelectedUserIds([]);
            loadData();
        } catch (error) {
            toast({ variant: "destructive", title: "Error assigning users" });
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Group Management</h1>
                    <p className="text-gray-500">Create and manage user groups.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create Group
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Group</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="groupName">Group Name</Label>
                                <Input
                                    id="groupName"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="groupDescription">Description</Label>
                                <Input
                                    id="groupDescription"
                                    value={newGroupDescription}
                                    onChange={(e) => setNewGroupDescription(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleCreateGroup} className="w-full">
                                Create Group
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Groups</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Members</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groups.map((group) => (
                                <TableRow key={group.id}>
                                    <TableCell className="font-medium">{group.name}</TableCell>
                                    <TableCell>{group.description}</TableCell>
                                    <TableCell>{group.memberIds?.length || 0}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedGroup(group);
                                                setIsAssignOpen(true);
                                            }}
                                        >
                                            <Users className="mr-2 h-4 w-4" />
                                            Manage Users
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Users to {selectedGroup?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="max-h-64 overflow-y-auto space-y-2">
                            {users.map((user) => (
                                <div key={user.uid} className="flex items-center space-x-2">
                                    <Checkbox
                                        checked={selectedUserIds.includes(user.uid)}
                                        onCheckedChange={(checked) => {
                                            setSelectedUserIds(prev =>
                                                checked
                                                    ? [...prev, user.uid]
                                                    : prev.filter(id => id !== user.uid)
                                            );
                                        }}
                                    />
                                    <Label className="text-sm">{user.displayName} ({user.email})</Label>
                                </div>
                            ))}
                        </div>
                        <Button onClick={handleAssignUsers} className="w-full">
                            Assign Selected Users
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}