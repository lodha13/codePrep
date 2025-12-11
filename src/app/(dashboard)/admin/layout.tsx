"use client";

import { AdminSidebar } from "@/components/layout/AdminSidebar";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <div className="flex min-h-screen bg-gray-100">
                <AdminSidebar />
                <main className="flex-1 ml-64 p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </ProtectedRoute>
    );
}
