'use server';

import { revalidatePath } from 'next/cache';
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, UserRole, Quiz } from '@/types/schema';
import { cache } from 'react';

export const getUsers = cache(async (): Promise<User[]> => {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const usersList = usersSnapshot.docs.map(d => d.data() as User);
    // Filter for candidates only for assignment purposes
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
    const quizzesList = quizzesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Quiz));
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
        
        // Revalidate the path for the quizzes page if needed, though this action
        // doesn't directly change what's on the quizzes list itself.
        // revalidatePath('/admin/quizzes');

        return { success: true, message: `Quiz assigned to ${userIds.length} user(s).` };

    } catch (error: any) {
        return { success: false, message: error.message || "An unknown error occurred." };
    }
}
