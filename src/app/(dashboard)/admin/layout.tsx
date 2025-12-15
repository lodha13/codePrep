
"use client";

import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { role, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && role && role !== 'admin') {
            router.push('/candidate');
        }
    }, [role, loading, router]);

    // While checking the role, you can show a loader
    if (loading || role !== 'admin') {
        return <div className="flex h-screen w-screen items-center justify-center">Checking permissions...</div>;
    }
    
    return (
        <div className="flex min-h-screen bg-gray-100">
            <AdminSidebar />
            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
