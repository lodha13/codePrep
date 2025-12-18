import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app;
if (!getApps().length) {
    try {
        app = initializeApp(firebaseConfig);
    } catch (e) {
        console.error("Firebase initialization error", e);
        throw e; // Re-throw the error to make it visible
    }
} else {
    app = getApp();
}

const auth = getAuth(app);
auth.tenantId = "9d343c00-4814-47eb-abcd-e3a0761d628b";
const db = getFirestore(app);

// Helper function to get or create a unique quiz session
export async function getOrCreateQuizSession(userId: string, quizId: string, quizTitle: string) {
    const { doc, getDoc, setDoc, Timestamp } = await import('firebase/firestore');
    
    // Use composite ID to ensure uniqueness: userId_quizId
    const sessionId = `${userId}_${quizId}`;
    const sessionRef = doc(db, "results", sessionId);
    
    // Try to get existing session
    const existingDoc = await getDoc(sessionRef);
    
    if (existingDoc.exists()) {
        return { id: existingDoc.id, ...existingDoc.data() };
    }
    
    // Create new session with fixed ID
    const newSessionData = {
        quizId,
        quizTitle,
        userId,
        startedAt: Timestamp.now(),
        status: 'in-progress' as const,
        score: 0,
        totalScore: 0,
        answers: {},
    };
    
    await setDoc(sessionRef, newSessionData);
    return { id: sessionId, ...newSessionData };
}

export { app, auth, db };
