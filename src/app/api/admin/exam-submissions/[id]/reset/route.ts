import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { logAdminAction } from "@/lib/admin-log";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const db = supabaseAdmin();
    const submissionId = Number(id);

    const { data: submission, error: submissionError } = await (db.from("exam_submissions") as any)
      .select("*")
      .eq("id", submissionId)
      .maybeSingle();

    if (submissionError) {
      return NextResponse.json({ error: submissionError.message }, { status: 500 });
    }

    if (!submission) {
      return NextResponse.json({ error: "Không tìm thấy bài làm để reset" }, { status: 404 });
    }

    await (db.from("exam_starts") as any).delete().eq("exam_id", submission.exam_id).eq("student_id", submission.student_id);
    const { error } = await (db.from("exam_submissions") as any).delete().eq("id", submission.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAction("reset_exam_submission", { examId: submission.exam_id, studentId: submission.student_id, submissionId: submission.id }, "Cho học sinh làm lại bài thi");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
