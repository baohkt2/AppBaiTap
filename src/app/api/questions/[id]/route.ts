import { NextRequest, NextResponse } from "next/server";
import { getStudentId } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { maskQuestion } from "@/lib/masking";
import { questionSchema } from "@/lib/schema";

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from("questions") as any)
    .select("id, data, status")
    .eq("id", id)
    .eq("status", "approved")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Không tìm thấy câu hỏi" }, { status: 404 });
  }

  // Parse question from JSONB
  const parsed = questionSchema.safeParse(data.data);
  if (!parsed.success) {
    console.error("Invalid question data in DB:", id);
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
