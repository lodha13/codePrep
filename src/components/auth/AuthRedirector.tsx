'use client';

import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Routes that are accessible to unauthenticated users
const publicRoutes = ['/login', '/register', '/'];
const adminRoutes = ['/admin', '/admin/users', '/admin/quizzes', '/admin/quizzes/create', '/admin/questions/upload'];


export default function AuthRedirector({ children }: { children: React.ReactNode }) {
    const { user, loading, role } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (loading) {
            return; // Wait until authentication status is determined
        }

        const isPublicRoute = publicRoutes.includes(pathname);
        const isAdminRoute = adminRoutes.some(p => pathname.startsWith(p));
        
        if (user) {
            // User is logged in
            const targetDashboard = role === 'admin' ? '/admin' : '/candidate';
            
            // If user is on a public route (like /login), redirect to their dashboard.
            if (isPublicRoute) {
                router.push(targetDashboard);
                return;
            }

            // If a non-admin tries to access an admin route, redirect them.
            if (isAdminRoute && role !== 'admin') {
                router.push('/candidate');
                return;
            }

            // If an admin tries to access a non-admin, non-public route (like /candidate), redirect them.
            if (role === 'admin' && !isAdminRoute && !isPublicRoute) {
                router.push('/admin');
                return;
            }


        } else {
            // User is not logged in
            if (!isPublicRoute) {
                // If trying to access a protected page, redirect to login
                router.push('/login');
                return;
            }
        }

    }, [user, loading, role, router, pathname]);

    // While checking auth, show a loading screen to prevent flicker
    if (loading) {
        return <div className="flex h-screen w-screen items-center justify-center">Loading...</div>;
    }
    
    // If a logged-in user is on a public page, show a "Redirecting" message until the redirect completes
    if(user && publicRoutes.includes(pathname)) {
        return <div className="flex h-screen w-screen items-center justify-center">Redirecting...</div>;
    }

    // If a logged-out user tries to access a protected page, render nothing to avoid showing content before redirect
    if(!user && !publicRoutes.includes(pathname)) {
         return null;
    }

    // Otherwise, show the page content
    return <>{children}</>;
}
