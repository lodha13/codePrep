'use client';

import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Routes that are accessible to unauthenticated users
const publicRoutes = ['/login', '/register', '/'];

export default function AuthRedirector({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (loading) {
            return; // Wait until authentication status is determined
        }

        const isPublicRoute = publicRoutes.includes(pathname);

        if (user) {
            // User is logged in
            const targetDashboard = user.role === 'admin' ? '/admin' : '/candidate';

            if (isPublicRoute) {
                // If on a public page, redirect to their dashboard
                router.push(targetDashboard);
            }
            // If on a protected page, let ProtectedRoute handle it.

        } else {
            // User is not logged in
            if (!isPublicRoute) {
                // If trying to access a protected page, redirect to login
                router.push('/login');
            }
        }

    }, [user, loading, router, pathname]);

    // Render a loading state while checking auth
    if (loading) {
        return <div className="flex h-screen w-screen items-center justify-center">Loading...</div>;
    }
    
    // If logged in and on a public route, show loading until redirect happens
    if(user && publicRoutes.includes(pathname)) {
        return <div className="flex h-screen w-screen items-center justify-center">Redirecting...</div>;
    }

    // If not logged in and on a protected route, show nothing to avoid flash of content
    if(!user && !publicRoutes.includes(pathname)) {
         return null;
    }

    return <>{children}</>;
}
