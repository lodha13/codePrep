
import { db } from "./firebase";
import { collection, deleteDoc, doc, getDoc, writeBatch, query, where, documentId, getDocs } from "firebase/firestore";

export async function deleteQuiz(quizId: string): Promise<{ success: boolean; message?: string }> {
    if (!quizId) {
        return { success: false, message: "Quiz ID is required." };
    }

    try {
        const batch = writeBatch(db);
        const quizRef = doc(db, "quizzes", quizId);

        // 1. Get the quiz document to retrieve questionIds
        const quizSnap = await getDoc(quizRef);
        if (!quizSnap.exists()) {
            return { success: false, message: "Quiz not found." };
        }
        const quizData = quizSnap.data();
        const questionIds = quizData.questionIds || [];

        // 2. Delete all questions associated with the quiz in a single batch
        if (questionIds.length > 0) {
            const questionsQuery = query(collection(db, "questions"), where(documentId(), 'in', questionIds));
            const questionsSnapshot = await getDocs(questionsQuery);
            questionsSnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
        }

        // 3. Delete the quiz itself
        batch.delete(quizRef);

        await batch.commit();

        return { success: true, message: "Quiz and all associated questions have been deleted." };
    } catch (error) {
        console.error("Error deleting quiz:", error);
        return { success: false, message: "An error occurred while deleting the quiz." };
    }
}
