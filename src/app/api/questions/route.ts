import { NextRequest, NextResponse } from "next/server";
import { getStudentId } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const studentId = await getStudentId();
  if (!studentId) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode");
  const structureFilter = searchParams.get("structure");

  const db = supabaseAdmin();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db.from("questions") as any)
    .select("id, mode, type, data, status")
    .eq("status", "approved");

  if (mode) {
    query = query.eq("mode", mode);
  }
  if (structureFilter) {
    query = query.eq("type", structureFilter);
  }

  const { data: questions, error } = await query.order("created_at", { ascending: true });

  if (error) {
    console.error("Questions fetch error:", error);
    return NextResponse.json({ error: "Lỗi tải câu hỏi" }, { status: 500 });
  }

  // Get student's completed questions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: attempts } = await (db.from("attempts") as any)
    .select("question_id")
    .eq("student_id", studentId);

  const completedIds = new Set(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (attempts ?? []).map((a: any) => a.question_id)
  );

  // Return list with minimal info (no answers)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list = (questions ?? []).map((q: any) => ({
    id: q.id,
    mode: q.mode,
    structure: q.type,
    title: q.data?.title ?? "",
    completed: completedIds.has(q.id),
  }));

  return NextResponse.json({ questions: list });
}
