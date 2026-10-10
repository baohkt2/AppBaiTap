import { NextRequest, NextResponse } from "next/server";
import { getStudentId } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { maskQuestion } from "@/lib/masking";
import { questionSchema } from "@/lib/schema";
import { loadExamById } from "@/lib/exams";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const studentId = await getStudentId();
  if (!studentId) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await params;
  const db = supabaseAdmin();

  const loadedExam = await loadExamById(db, id);
  if (loadedExam) {
    const maskedExam = {
      ...loadedExam.exam,
      questions: loadedExam.exam.questions.map((question) => ({
        id: question.id,
        type: question.type,
        difficulty: question.difficulty,
        content: question.content,
        options: question.options,
        scoreWeight: question.scoreWeight,
      })),
    };

    return NextResponse.json({ exam: maskedExam });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from("questions") as any)
    .select("id, mode, data, status")
    .eq("id", id)
    .eq("status", "approved")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Không tìm thấy câu hỏi/đề thi" }, { status: 404 });
  }

  // Handle Practice Questions
  const parsed = questionSchema.safeParse(data.data);
  if (!parsed.success) {
    console.error("Invalid question data in DB:", id, parsed.error);
    return NextResponse.json({ error: "Dữ liệu câu hỏi bị lỗi" }, { status: 500 });
  }

  // Check if student already completed this question
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: attempt } = await (db.from("attempts") as any)
    .select("correct")
    .eq("student_id", studentId)
    .eq("question_id", id)
    .single();

  const masked = maskQuestion(parsed.data);

  return NextResponse.json({
    question: masked,
    completed: !!attempt,
  });
}
