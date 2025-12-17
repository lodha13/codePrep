import { db } from "@/lib/firebase";
import { collection, doc, getDocs, updateDoc, addDoc, deleteDoc, getDoc, writeBatch, arrayUnion, arrayRemove } from "firebase/firestore";
import { Group, User, Quiz } from "@/types/schema";

// Group Management
export const createGroup = async (groupData: Omit<Group, 'id'>) => {
    const docRef = await addDoc(collection(db, "groups"), groupData);
    return docRef.id;
};

export const getGroups = async (): Promise<Group[]> => {
    const snapshot = await getDocs(collection(db, "groups"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
};

export const updateGroup = async (groupId: string, updates: Partial<Group>) => {
    await updateDoc(doc(db, "groups", groupId), updates);
};

export const deleteGroup = async (groupId: string) => {
    await deleteDoc(doc(db, "groups", groupId));
};

// User-Group Management
export const assignUsersToGroup = async (groupId: string, userIds: string[]) => {
    const batch = writeBatch(db);
    
    // Update group with new members
    const groupRef = doc(db, "groups", groupId);
    batch.update(groupRef, { memberIds: arrayUnion(...userIds) });
    
    // Update users with group assignment
    userIds.forEach(userId => {
        const userRef = doc(db, "users", userId);
        batch.update(userRef, { groupIds: arrayUnion(groupId) });
    });
    
    await batch.commit();
};

export const removeUsersFromGroup = async (groupId: string, userIds: string[]) => {
    const batch = writeBatch(db);
    
    // Update group
    const groupRef = doc(db, "groups", groupId);
    batch.update(groupRef, { memberIds: arrayRemove(...userIds) });
    
    // Update users
    userIds.forEach(userId => {
        const userRef = doc(db, "users", userId);
        batch.update(userRef, { groupIds: arrayRemove(groupId) });
    });
    
    await batch.commit();
};

// Quiz Assignment
export const assignQuizToUsersAndGroups = async (quizId: string, userIds: string[] = [], groupIds: string[] = []) => {
    const batch = writeBatch(db);
    
    // Update quiz with assignments
    const quizRef = doc(db, "quizzes", quizId);
    const updates: any = {};
    if (userIds.length > 0) updates.assignedUserIds = arrayUnion(...userIds);
    if (groupIds.length > 0) updates.assignedGroupIds = arrayUnion(...groupIds);
    batch.update(quizRef, updates);
    
    // Update individual users
    userIds.forEach(userId => {
        const userRef = doc(db, "users", userId);
        batch.update(userRef, { assignedQuizIds: arrayUnion(quizId) });
    });
    
    // Update group members
    for (const groupId of groupIds) {
        const groupDoc = await getDoc(doc(db, "groups", groupId));
        if (groupDoc.exists()) {
            const group = groupDoc.data() as Group;
            group.memberIds?.forEach(userId => {
                const userRef = doc(db, "users", userId);
                batch.update(userRef, { assignedQuizIds: arrayUnion(quizId) });
            });
        }
    }
    
    await batch.commit();
};

// Get user's assigned quizzes (direct + group assignments)
export const getUserAssignedQuizzes = async (userId: string): Promise<Quiz[]> => {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return [];
    
    const user = userDoc.data() as User;
    const directQuizIds = user.assignedQuizIds || [];
    
    // Get quizzes assigned to user's groups
    const groupQuizIds: string[] = [];
    if (user.groupIds?.length) {
        const quizzesSnapshot = await getDocs(collection(db, "quizzes"));
        quizzesSnapshot.docs.forEach(doc => {
            const quiz = doc.data() as Quiz;
            if (quiz.assignedGroupIds?.some(groupId => user.groupIds?.includes(groupId))) {
                groupQuizIds.push(doc.id);
            }
        });
    }
    
    const allQuizIds = [...new Set([...directQuizIds, ...groupQuizIds])];
    
    // Fetch quiz details
    const quizzes: Quiz[] = [];
    for (const quizId of allQuizIds) {
        const quizDoc = await getDoc(doc(db, "quizzes", quizId));
        if (quizDoc.exists()) {
            quizzes.push({ id: quizDoc.id, ...quizDoc.data() } as Quiz);
        }
    }
    
    return quizzes;
};