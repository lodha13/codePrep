"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserRole } from "@/types/schema";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles: UserRole[]; // Made mandatory
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, loading, role } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) {
            return; // Wait for the auth state to be confirmed
        }

        if (!user) {
            // This case should be handled by AuthRedirector, but as a fallback
            router.push("/login");
            return;
        }

        if (!allowedRoles.includes(role!)) {
            // If user's role is not allowed, redirect them.
            // A good place would be their own dashboard or a dedicated 'unauthorized' page.
            const targetDashboard = user.role === 'admin' ? '/admin' : '/candidate';
            router.push(targetDashboard);
        }

    }, [user, loading, role, router, allowedRoles]);


    // While loading, or if user is null, or if role doesn't match, don't render children
    if (loading || !user || !role || !allowedRoles.includes(role)) {
         return <div className="flex h-screen w-screen items-center justify-center">Checking permissions...</div>;
    }

    // If everything is fine, render the children
    return <>{children}</>;
}
