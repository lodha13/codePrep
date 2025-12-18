import { signInWithPopup, OAuthProvider } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { User } from "@/types/schema";

export const signInWithBounteous = async () => {
    const provider = new OAuthProvider('microsoft.com');
    provider.setCustomParameters({
        // Prompt for consent and prompt for account selection
        prompt: 'select_account',
        // Allows signing in with only work or school accounts from a specific tenant
        tenant: "9d343c00-4814-47eb-abcd-e3a0761d628b"
    });
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
            groupIds: [],
            isBench: true,
        };
        await setDoc(doc(db, "users", user.uid), newUser);
    }

    return result;
};