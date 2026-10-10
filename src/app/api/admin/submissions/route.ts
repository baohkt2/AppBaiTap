import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { loadExamById } from "@/lib/exams";

export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }

  try {
    const db = supabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const examId = searchParams.get("examId");
    const studentId = searchParams.get("studentId");

    if (id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: submission, error } = await (db.from("exam_submissions") as any)
        .select("id, exam_id, student_id, student_name, answers, total_score, status, created_at")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!submission) {
        return NextResponse.json({ error: "Không tìm thấy bài làm" }, { status: 404 });
      }

      const exam = await loadExamById(db, submission.exam_id, true);
      return NextResponse.json({ submission, exam });
    }

    let query = (db.from("exam_submissions") as any)
      .select("id, exam_id, student_id, student_name, total_score, status, created_at")
      .order("created_at", { ascending: false });

    if (examId) {
      query = query.eq("exam_id", examId);
    }
    if (studentId) {
      query = query.eq("student_id", studentId);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: submissions, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const examIds = Array.from(new Set((submissions ?? []).map((row: any) => row.exam_id)));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: examsRaw } = await (db.from("exams") as any)
      .select("id, title")
      .in("id", examIds.length > 0 ? examIds : [""]);

    const examTitleMap = new Map<string, string>();
    for (const row of examsRaw ?? []) {
      examTitleMap.set(row.id, row.title);
    }

    const list = (submissions ?? []).map((row: any) => ({
      id: row.id,
      examId: row.exam_id,
      examTitle: examTitleMap.get(row.exam_id) ?? row.exam_id,
      studentId: row.student_id,
      studentName: row.student_name ?? "",
      totalScore: Number(row.total_score ?? 0),
      status: row.status,
      createdAt: row.created_at ?? null,
    }));

    return NextResponse.json({ submissions: list });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
