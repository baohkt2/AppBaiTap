import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { logAdminAction } from "@/lib/admin-log";

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const studentId = String(body.studentId ?? "").trim();
    const questionId = String(body.questionId ?? "").trim();

    if (!studentId || !questionId) {
      return NextResponse.json({ error: "Thiếu studentId hoặc questionId" }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { error } = await (db.from("attempts") as any)
      .delete()
      .eq("student_id", studentId)
      .eq("question_id", questionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAction("reset_attempt", { studentId, questionId }, "Reset bài luyện tập của học sinh để làm lại");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
