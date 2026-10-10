import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { applyManualAttemptOverride } from "@/lib/admin-override";
import { logAdminAction } from "@/lib/admin-log";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const db = supabaseAdmin();
    const submissionId = Number(id);

    const { data: row, error: rowError } = await (db.from("submissions") as any)
      .select("*")
      .eq("id", submissionId)
      .maybeSingle();

    if (rowError) {
      return NextResponse.json({ error: rowError.message }, { status: 500 });
    }

    if (!row) {
      return NextResponse.json({ error: "Không tìm thấy bài làm luyện tập" }, { status: 404 });
    }

    const { data: questionRow } = await (db.from("questions") as any)
      .select("data")
      .eq("id", row.question_id)
      .maybeSingle();

    const questionData = questionRow?.data ?? {};
    const acceptedValues = questionData?.accepted ?? [];
    const result = applyManualAttemptOverride({
      mode: row.mode,
      correct: Boolean(body.correct),
      existingCorrect: Boolean(row.correct),
      existingPoints: Number(row.points ?? 0),
      addToAccepted: body.addToAccepted ? String(body.addToAccepted) : undefined,
      acceptedValues,
    });

    await (db.from("attempts") as any).upsert(
      {
        student_id: row.student_id,
        question_id: row.question_id,
        correct: result.correct,
        points: result.points,
        created_at: new Date().toISOString(),
      },
      { onConflict: "student_id,question_id" }
    );

    if (questionData && typeof questionData === "object" && ("accepted" in questionData || "blanks" in questionData)) {
      const nextAccepted = result.accepted;
      await (db.from("questions") as any)
        .update({ data: { ...questionData, accepted: nextAccepted } })
        .eq("id", row.question_id);
    }

    await (db.from("submissions") as any)
      .update({
        correct: result.correct,
        points: result.points,
        judge_reason: String(body.note ?? row.judge_reason ?? "") || null,
      })
      .eq("id", row.id);

    await logAdminAction("override_algo_submission", { submissionId, questionId: row.question_id, correct: result.correct, note: body.note }, "Ghi đè kết quả bài luyện tập");
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
