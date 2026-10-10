import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { loadExamById } from "@/lib/exams";
import { computeExamTotal } from "@/lib/exam-score";
import { logAdminAction } from "@/lib/admin-log";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const questionId = String(body.questionId ?? "").trim();
    const mode = String(body.mode ?? "manual").trim();
    const score = Number(body.score ?? 0);

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
      return NextResponse.json({ error: "Không tìm thấy bài làm đề thi" }, { status: 404 });
    }

    const loadedExam = await loadExamById(db, submission.exam_id, true);
    if (!loadedExam) {
      return NextResponse.json({ error: "Không tìm thấy đề thi" }, { status: 404 });
    }

    const question = loadedExam.exam.questions.find((item) => item.id === questionId);
    if (!question) {
      return NextResponse.json({ error: "Không tìm thấy câu hỏi trong đề" }, { status: 404 });
    }

    const previousAnswers = (submission.answers && typeof submission.answers === "object" ? submission.answers : {}) as Record<string, unknown>;
    const questionScore = Math.max(0, Math.min(Number(score || question.scoreWeight || 0), Number(question.scoreWeight ?? 0)));
    const gradedByQuestion = {
      [question.id]: { score: questionScore },
    };
    const nextTotal = computeExamTotal(loadedExam.exam, loadedExam.exam.questions, previousAnswers, gradedByQuestion);

    const { error: updateError } = await (db.from("exam_submissions") as any)
      .update({
        total_score: nextTotal,
        graded_by: mode === "ai" ? "auto" : "manual",
        teacher_note: String(body.note ?? submission.teacher_note ?? "") || null,
      })
      .eq("id", submission.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await logAdminAction("regrade", { submissionId, questionId, score: questionScore, mode }, "Chấm lại câu tự luận hoặc điểm đề thi");
    return NextResponse.json({ ok: true, totalScore: nextTotal, score: questionScore });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
