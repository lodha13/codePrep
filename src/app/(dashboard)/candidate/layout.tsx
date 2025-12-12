"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Code, LogOut, Search, User as UserIcon } from 'lucide-react';
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
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function CandidateLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, signOut } = useAuth();

    const getInitials = (name?: string) => {
        if (!name) return "U";
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    return (
        <ProtectedRoute allowedRoles={["candidate"]}>
            <div className="min-h-screen bg-background font-body">
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-white px-4 md:px-6">
                    <div className="flex items-center gap-8">
                        <Link href="/candidate" className="flex items-center gap-2 font-bold text-lg">
                            <Code className="h-6 w-6 text-primary" />
                            CodePrep Pro
                        </Link>
                        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                            <Link href="/candidate" className="text-foreground transition-colors hover:text-foreground/80">Prepare</Link>
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
                                <DropdownMenuItem asChild>
                                    <Link href="/candidate/profile">
                                        <UserIcon className="mr-2 h-4 w-4" /> View Profile
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => signOut()}>
                                    <LogOut className="mr-2 h-4 w-4" /> Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>
                <main>{children}</main>
            </div>
        </ProtectedRoute>
    );
}
