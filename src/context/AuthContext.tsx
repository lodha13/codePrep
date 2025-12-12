
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { User, UserRole } from "@/types/schema";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
    user: User | null; // Our schema User
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    role: UserRole | null;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    firebaseUser: null,
    loading: true,
    role: null,
    signOut: async () => { },
});

// Helper function to set a cookie
function setCookie(name: string, value: string, days: number) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    if (typeof document !== 'undefined') {
        document.cookie = name + "=" + (value || "")  + expires + "; path=/";
    }
}

function eraseCookie(name: string) {   
    if (typeof document !== 'undefined') {
        document.cookie = name+'=; Max-Age=-99999999;';  
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            setFirebaseUser(fbUser);
            if (fbUser) {
                // Set a session cookie to be used by the middleware
                setCookie('__session', 'true', 1);

                const userDocRef = doc(db, "users", fbUser.uid);
                const userDoc = await getDoc(userDocRef);
                let appUser: User | null = null;
                if (userDoc.exists()) {
                    appUser = userDoc.data() as User;
                    setUser(appUser);
                } else {
                    const newUser: User = {
                        uid: fbUser.uid,
                        email: fbUser.email!,
                        displayName: fbUser.displayName || 'New User',
                        role: "candidate", // Default role
                        createdAt: new Date(),
                    };
                    await setDoc(userDocRef, newUser);
                    appUser = newUser;
                    setUser(newUser);
                }
                
                // Re-introduce client-side role-based redirection AFTER login
                const isAuthRoute = pathname === '/login' || pathname === '/register';
                if (isAuthRoute) {
                    if (appUser?.role === 'admin') {
                        router.push('/admin');
                    } else {
                        router.push('/candidate');
                    }
                }

            } else {
                // User is signed out, clear the session cookie
                eraseCookie('__session');
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [pathname, router]);

    const signOut = async () => {
        await firebaseSignOut(auth);
        eraseCookie('__session'); // Ensure cookie is removed on sign out
        router.push('/login'); // Redirect to login after sign out
    };

    if (loading) {
        return <div className="flex h-screen w-screen items-center justify-center">Loading...</div>;
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                firebaseUser,
                loading,
                role: user?.role || null,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
