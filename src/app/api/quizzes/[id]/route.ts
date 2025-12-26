
import { NextRequest, NextResponse } from "next/server";
import { deleteQuiz } from "@/lib/quiz-utils";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: quizId } = await params;

    if (!quizId) {
        return NextResponse.json({ success: false, message: "Quiz ID is required." }, { status: 400 });
    }

    const result = await deleteQuiz(quizId);

    if (result.success) {
        return NextResponse.json({ success: true, message: result.message }, { status: 200 });
    } else {
        return NextResponse.json({ success: false, message: result.message }, { status: 500 });
    }
}
