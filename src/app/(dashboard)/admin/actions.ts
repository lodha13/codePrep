'use server';

import { revalidatePath } from 'next/cache';
import { collection, getDocs, doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, UserRole, Quiz } from '@/types/schema';
import { cache } from 'react';

export const getUsers = cache(async (): Promise<User[]> => {
    const usersSnapshot = await getDocs(collection(db, "users"));
    // Convert Firestore Timestamps to JS Date objects
    const usersList = usersSnapshot.docs.map(d => {
        const data = d.data();
        return {
            ...data,
            createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        } as User;
    });
    return usersList;
});


export async function updateUserRole(uid: string, newRole: UserRole): Promise<{ success: boolean; message?: string }> {
    if (!uid || !newRole) {
        return { success: false, message: 'Invalid arguments' };
    }

    try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
            role: newRole
        });
        revalidatePath('/admin/users'); // Refresh the user list page
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}


export const getQuizzes = cache(async (): Promise<Quiz[]> => {
    const quizzesSnapshot = await getDocs(collection(db, "quizzes"));
    // Convert Firestore Timestamps to JS Date objects
    const quizzesList = quizzesSnapshot.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            ...data,
            createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        } as Quiz;
    });
    return quizzesList;
});

export async function assignQuizToUsers(quizId: string, userIds: string[]): Promise<{ success: boolean; message?: string }> {
    if (!quizId || !userIds || userIds.length === 0) {
        return { success: false, message: "Invalid arguments provided." };
    }

    try {
        const batch = userIds.map(userId => {
            const userRef = doc(db, 'users', userId);
            return updateDoc(userRef, {
                assignedQuizIds: arrayUnion(quizId)
            });
        });
        
        await Promise.all(batch);
        
        revalidatePath('/candidate');
        revalidatePath('/admin/quizzes');


        return { success: true, message: `Quiz assigned to ${userIds.length} user(s).` };

    } catch (error: any) {
        return { success: false, message: error.message || "An unknown error occurred." };
    }
}
