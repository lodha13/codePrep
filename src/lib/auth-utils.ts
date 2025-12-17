import { signInWithPopup, OAuthProvider } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { User } from "@/types/schema";

export const signInWithBounteous = async () => {
    const provider = new OAuthProvider('microsoft.com');
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user document exists, create if not
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
        const newUser: User = {
            uid: user.uid,
            email: user.email!,
            displayName: user.displayName || user.email!.split('@')[0],
            role: "candidate",
            createdAt: new Date(),
            completedQuizIds: [],
            assignedQuizIds: [],
        };
        await setDoc(doc(db, "users", user.uid), newUser);
    }

    return result;
};