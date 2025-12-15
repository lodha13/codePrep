'use server';

import { revalidatePath } from 'next/cache';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, UserRole, Quiz } from '@/types/schema';

// This is a simplified server action. In a real app, you'd want robust security
// to ensure only admins can call this. For this prototype, we assume it's
// only exposed in the admin panel.

export async function getUsers(): Promise<User[]> {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const usersList = usersSnapshot.docs.map(d => d.data() as User);
    return usersList;
}

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


export async function getQuizzes(): Promise<Quiz[]> {
    const quizzesSnapshot = await getDocs(collection(db, "quizzes"));
    const quizzesList = quizzesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Quiz));
    return quizzesList;
}
