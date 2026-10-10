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
    const fromId = String(body.fromId ?? "").trim();
    const toId = String(body.toId ?? "").trim();
    const dryRun = Boolean(body.dryRun);

    if (!fromId || !toId || fromId === toId) {
      return NextResponse.json({ error: "Chọn 2 học sinh khác nhau" }, { status: 400 });
    }

    const db = supabaseAdmin();

    const [{ data: fromAttempts = [] }, { data: toAttempts = [] }, { data: fromExamSubmissions = [] }, { data: toExamSubmissions = [] }, { data: fromSubmissions = [] }, { data: fromStarts = [] }] = await Promise.all([
      (db.from("attempts") as any).select("*").eq("student_id", fromId),
      (db.from("attempts") as any).select("*").eq("student_id", toId),
      (db.from("exam_submissions") as any).select("*").eq("student_id", fromId),
      (db.from("exam_submissions") as any).select("*").eq("student_id", toId),
      (db.from("submissions") as any).select("*").eq("student_id", fromId),
      (db.from("exam_starts") as any).select("*").eq("student_id", fromId),
    ]);

    const targetExamIds = new Set((toExamSubmissions ?? []).map((row: any) => String(row.exam_id)));
    const conflictingExamIds = (fromExamSubmissions ?? []).filter((row: any) => targetExamIds.has(String(row.exam_id))).map((row: any) => row.exam_id);

    const summary = {
      attempts: (fromAttempts ?? []).length,
      submissions: (fromSubmissions ?? []).length,
      examSubmissions: (fromExamSubmissions ?? []).length,
      examStarts: (fromStarts ?? []).length,
      conflicts: conflictingExamIds,
    };

    if (dryRun) {
      return NextResponse.json({ ok: true, dryRun: true, summary });
    }

    if (conflictingExamIds.length > 0) {
      return NextResponse.json({ error: "Có bài thi trùng nhau giữa 2 học sinh. Vui lòng xử lý thủ công", summary }, { status: 409 });
    }

    if ((fromAttempts ?? []).length > 0) {
      for (const row of fromAttempts as any[]) {
        const match = (toAttempts ?? []).find((target: any) => target.question_id === row.question_id);
        const mergedPoints = match && Number(match.points ?? 0) > Number(row.points ?? 0) ? Number(match.points ?? 0) : Number(row.points ?? 0);
        await (db.from("attempts") as any).upsert({
          student_id: toId,
          question_id: row.question_id,
          correct: !!(match ? match.correct : row.correct) || Boolean(row.correct),
          points: mergedPoints,
          created_at: new Date().toISOString(),
        }, { onConflict: "student_id,question_id" });
      }
    }

    if ((fromSubmissions ?? []).length > 0) {
      await (db.from("submissions") as any)
        .update({ student_id: toId })
        .eq("student_id", fromId);
    }

    if ((fromExamSubmissions ?? []).length > 0) {
      await (db.from("exam_submissions") as any)
        .update({ student_id: toId })
        .eq("student_id", fromId);
    }

    if ((fromStarts ?? []).length > 0) {
      await (db.from("exam_starts") as any)
        .update({ student_id: toId })
        .eq("student_id", fromId);
    }

    await (db.from("judge_calls") as any).update({ student_id: toId }).eq("student_id", fromId);
    await (db.from("students") as any).delete().eq("id", fromId);

    await logAdminAction("merge_student", { fromId, toId, summary }, "Gộp tài khoản học sinh");
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
