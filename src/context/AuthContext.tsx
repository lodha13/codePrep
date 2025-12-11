"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { User, UserRole } from "@/types/schema";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            setFirebaseUser(fbUser);
            if (fbUser) {
                // Fetch user profile from Firestore
                const userDoc = await getDoc(doc(db, "users", fbUser.uid));
                if (userDoc.exists()) {
                    setUser(userDoc.data() as User);
                } else {
                    // If user exists in Auth but not Firestore, it might be a new registration
                    // The registration component should handle creating the user doc
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signOut = async () => {
        await firebaseSignOut(auth);
    };

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
