
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { User, UserRole } from "@/types/schema";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    role: UserRole | null;
    signOut: () => Promise<void>;
    updateUserCache: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    firebaseUser: null,
    loading: true,
    role: null,
    signOut: async () => { },
    updateUserCache: () => { },
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

    // Simple cache update function for optimistic updates
    const updateUserCache = (updates: Partial<User>) => {
        if (user) {
            setUser(prev => prev ? { ...prev, ...updates } : null);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            setFirebaseUser(fbUser);
            if (fbUser) {
                setCookie('__session', 'true', 1);

                const userDocRef = doc(db, "users", fbUser.uid);
                const userDoc = await getDoc(userDocRef);
                let appUser: User | null = null;

                if (userDoc.exists()) {
                    appUser = userDoc.data() as User;
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
                }

                if (appUser) {
                    // Get all assigned quiz IDs (direct and from groups) to provide a complete list for client-side auth checks
                    const directQuizIds = appUser.assignedQuizIds || [];
                    const groupQuizIds: string[] = [];
                    if (appUser.groupIds && appUser.groupIds.length > 0) {
                        const q = query(collection(db, "quizzes"), where("assignedGroupIds", "array-contains-any", appUser.groupIds));
                        const quizzesSnapshot = await getDocs(q);
                        quizzesSnapshot.forEach(doc => {
                            groupQuizIds.push(doc.id);
                        });
                    }
                    // The full list of quizzes the user has access to
                    appUser.assignedQuizIds = [...new Set([...directQuizIds, ...groupQuizIds])];
                }

                setUser(appUser);
                
                // Client-side redirect after login
                const isAuthRoute = pathname === '/login' || pathname === '/register';
                if (isAuthRoute) {
                    if (appUser?.role === 'admin') {
                        router.push('/admin');
                    } else {
                        router.push('/candidate');
                    }
                }
            } else {
                eraseCookie('__session');
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    // The dependency array is intentionally empty to only run this on mount.
    // The router and pathname are available within the callback's scope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                updateUserCache,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
