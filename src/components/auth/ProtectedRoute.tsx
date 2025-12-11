"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserRole } from "@/types/schema";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/login");
            } else if (allowedRoles && !allowedRoles.includes(user.role)) {
                router.push("/"); // Or unauthorized page
            }
        }
    }, [user, loading, router, allowedRoles]);

    if (loading) {
        return <div>Loading...</div>; // Replace with a spinner
    }

    if (!user) {
        return null;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return null; // Or unauth message
    }

    return <>{children}</>;
}
