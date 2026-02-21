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
import { createGroup, getGroups, assignUsersToGroup, removeUsersFromGroup } from "@/lib/admin-utils";
import { getUsers } from "../actions";
import { PlusCircle, Users } from "lucide-react";

export default function GroupsPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [showGroupUsersModal, setShowGroupUsersModal] = useState(false);
    const [groupSearch, setGroupSearch] = useState("");
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [selectedToAddIds, setSelectedToAddIds] = useState<string[]>([]);
    const [selectedToRemoveIds, setSelectedToRemoveIds] = useState<string[]>([]);
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
            // include all users (admins + candidates)
            setUsers(usersData);
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
                                                setShowGroupUsersModal(true);
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

            <Dialog open={showGroupUsersModal} onOpenChange={setShowGroupUsersModal}>
                <DialogContent className="max-w-5xl max-h-[85vh]">
                    <DialogHeader>
                        <DialogTitle>Users in {selectedGroup?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="p-4">
                        <input
                            type="text"
                            placeholder="Search by name or email"
                            className="w-full p-2 border rounded-md mb-3"
                            value={groupSearch}
                            onChange={(e) => setGroupSearch(e.target.value)}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            {/* Current members */}
                            <div>
                                <div className="mb-2 font-medium">Current Members</div>
                                <div className="max-h-[60vh] overflow-y-auto space-y-2 border rounded p-2 bg-white">
                                    {users
                                        .filter(u => selectedGroup && (
                                            (selectedGroup.memberIds && selectedGroup.memberIds.includes(u.uid)) ||
                                            (u.groupIds && u.groupIds.includes(selectedGroup!.id))
                                        ))
                                        .filter(u => {
                                            const q = groupSearch.toLowerCase();
                                            return (
                                                (u.displayName || '').toLowerCase().includes(q) ||
                                                (u.email || '').toLowerCase().includes(q)
                                            );
                                        })
                                        .map(user => (
                                            <label key={user.uid} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                                                <div>
                                                    <div className="font-medium">{user.displayName}</div>
                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedToRemoveIds.includes(user.uid)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedToRemoveIds(prev => [...prev, user.uid]);
                                                        else setSelectedToRemoveIds(prev => prev.filter(id => id !== user.uid));
                                                    }}
                                                    className="h-4 w-4"
                                                />
                                            </label>
                                        ))}
                                </div>
                                <div className="mt-3">
                                    <Button
                                        onClick={async () => {
                                            if (!selectedGroup || selectedToRemoveIds.length === 0) return;
                                            try {
                                                await removeUsersFromGroup(selectedGroup.id, selectedToRemoveIds);
                                                toast({ title: 'Users removed from group' });
                                                setSelectedToRemoveIds([]);
                                                loadData();
                                            } catch (err) {
                                                toast({ variant: 'destructive', title: 'Error removing users' });
                                            }
                                        }}
                                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                                    >
                                        Remove Selected
                                    </Button>
                                </div>
                            </div>

                            {/* Available users to add */}
                            <div>
                                <div className="mb-2 font-medium">Available Users (not in group)</div>
                                <div className="max-h-[60vh] overflow-y-auto space-y-2 border rounded p-2 bg-white">
                                    {users
                                        .filter(u => selectedGroup && !(
                                            (selectedGroup.memberIds && selectedGroup.memberIds.includes(u.uid)) ||
                                            (u.groupIds && u.groupIds.includes(selectedGroup!.id))
                                        ))
                                        .filter(u => {
                                            const q = groupSearch.toLowerCase();
                                            return (
                                                (u.displayName || '').toLowerCase().includes(q) ||
                                                (u.email || '').toLowerCase().includes(q)
                                            );
                                        })
                                        .map(user => (
                                            <label key={user.uid} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                                                <div>
                                                    <div className="font-medium">{user.displayName}</div>
                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedToAddIds.includes(user.uid)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedToAddIds(prev => [...prev, user.uid]);
                                                        else setSelectedToAddIds(prev => prev.filter(id => id !== user.uid));
                                                    }}
                                                    className="h-4 w-4"
                                                />
                                            </label>
                                        ))}
                                </div>
                                <div className="mt-3">
                                    <Button
                                        onClick={async () => {
                                            if (!selectedGroup || selectedToAddIds.length === 0) return;
                                            try {
                                                await assignUsersToGroup(selectedGroup.id, selectedToAddIds);
                                                toast({ title: 'Users added to group' });
                                                setSelectedToAddIds([]);
                                                loadData();
                                            } catch (err) {
                                                toast({ variant: 'destructive', title: 'Error adding users' });
                                            }
                                        }}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        Add Selected
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}