import { db } from "@/lib/firebase";
import { collection, doc, getDocs, updateDoc, addDoc, deleteDoc, getDoc, writeBatch, arrayUnion, arrayRemove, Timestamp, query, where, documentId } from "firebase/firestore";
import { Group, User, Quiz, ExternalCandidate, ExternalCandidateResult } from "@/types/schema";

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
    
    // Update quiz with assignment relationships
    const quizRef = doc(db, "quizzes", quizId);
    const updates: any = {};
    if (userIds.length > 0) updates.assignedUserIds = arrayUnion(...userIds);
    if (groupIds.length > 0) updates.assignedGroupIds = arrayUnion(...groupIds);
    if (Object.keys(updates).length > 0) {
        batch.update(quizRef, updates);
    }
    
    // Update individual users' assignedQuizIds for DIRECT assignment
    userIds.forEach(userId => {
        const userRef = doc(db, "users", userId);
        batch.update(userRef, { assignedQuizIds: arrayUnion(quizId) });
    });
    
    // Update groups' assignedQuizIds for GROUP assignment
    if (groupIds.length > 0) {
        groupIds.forEach(groupId => {
            const groupRef = doc(db, "groups", groupId);
            batch.update(groupRef, { assignedQuizIds: arrayUnion(quizId) });
        });
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
    if (user.groupIds && user.groupIds.length > 0) {
        const q = query(collection(db, "quizzes"), where("assignedGroupIds", "array-contains-any", user.groupIds));
        const quizzesSnapshot = await getDocs(q);
        quizzesSnapshot.forEach(doc => {
            groupQuizIds.push(doc.id);
        });
    }
    
    const allQuizIds = [...new Set([...directQuizIds, ...groupQuizIds])];
    
    // Fetch quiz details
    if (allQuizIds.length === 0) return [];

    const quizzes: Quiz[] = [];
    // Firestore 'in' query is limited to 30 elements.
    // We need to batch the requests if there are more.
    const batches = [];
    for (let i = 0; i < allQuizIds.length; i += 30) {
        const batchIds = allQuizIds.slice(i, i + 30);
        const q = query(collection(db, "quizzes"), where(documentId(), "in", batchIds));
        batches.push(getDocs(q));
    }

    const allBatches = await Promise.all(batches);
    for (const batchSnapshot of allBatches) {
        batchSnapshot.forEach(doc => {
            quizzes.push({ id: doc.id, ...doc.data() } as Quiz);
        });
    }
    
    return quizzes;
};

// External Candidate Assignment
export const createExternalAssignment = async (data: { name: string, email: string, quizId: string, quizTitle: string, expiresAt: Date }) => {
    try {
        const docRef = await addDoc(collection(db, "externalCandidates"), {
            ...data,
            createdAt: Timestamp.now(),
            expiresAt: Timestamp.fromDate(data.expiresAt),
        });
        return { success: true, assignmentId: docRef.id };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
};

// Get all external candidates with their results
export const getExternalCandidatesWithResults = async () => {
    try {
        // Fetch external candidates
        const candidatesSnapshot = await getDocs(collection(db, "externalCandidates"));
        const candidates = candidatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Fetch external candidate results
        const resultsSnapshot = await getDocs(collection(db, "externalCandidateResults"));
        const results = resultsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Combine candidates with their results
        const candidatesWithResults = candidates.map(candidate => {
            const result = results.find(r => r.externalCandidateId === candidate.id);
            return {
                ...candidate,
                result: result || null,
                status: result ? 'completed' : (new Date() > candidate.expiresAt.toDate() ? 'expired' : 'pending')
            };
        });
        
        return candidatesWithResults;
    } catch (error) {
        console.error('Error fetching external candidates:', error);
        return [];
    }
};

// Get external candidate result details
export const getExternalCandidateResult = async (resultId: string) => {
    try {
        const resultDoc = await getDoc(doc(db, "externalCandidateResults", resultId));
        if (resultDoc.exists()) {
            return { id: resultDoc.id, ...resultDoc.data() };
        }
        return null;
    } catch (error) {
        console.error('Error fetching external candidate result:', error);
        return null;
    }
};

