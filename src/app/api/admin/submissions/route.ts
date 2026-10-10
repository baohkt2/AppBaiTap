import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { loadExamById } from "@/lib/exams";
import { normalizeName } from "@/lib/normalize";

function normalizeSearchText(value: string) {
  return normalizeName(value || "").trim();
}

function toDateValue(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

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
      const sourceId = String(id).startsWith("algo-") ? String(id).replace(/^algo-/, "") : String(id).replace(/^exam-/, "");

      if (String(id).startsWith("algo-")) {
        const { data: row, error } = await (db.from("submissions") as any)
          .select("id, student_id, question_id, mode, answer, correct, points, judge_reason, created_at")
          .eq("id", Number(sourceId))
          .maybeSingle();

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!row) {
          return NextResponse.json({ error: "Không tìm thấy bài làm luyện tập" }, { status: 404 });
        }

        const { data: studentRow } = await (db.from("students") as any)
          .select("id, name, class")
          .eq("id", row.student_id)
          .maybeSingle();

        const { data: questionRow } = await (db.from("questions") as any)
          .select("id, data")
          .eq("id", row.question_id)
          .maybeSingle();

        return NextResponse.json({
          submission: {
            ...row,
            student_name: studentRow?.name ?? row.student_id,
            class_name: studentRow?.class ?? null,
            question_title: questionRow?.data?.title ?? row.question_id,
            type: "algo",
            score: Number(row.points ?? 0),
          },
          type: "algo",
          question: questionRow,
          student: studentRow,
        });
      }

      const { data: submission, error } = await (db.from("exam_submissions") as any)
        .select("id, exam_id, student_id, student_name, answers, total_score, status, created_at, duration_sec, is_late, graded_by, teacher_note")
        .eq("id", Number(sourceId))
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!submission) {
        return NextResponse.json({ error: "Không tìm thấy bài làm" }, { status: 404 });
      }

      const exam = await loadExamById(db, submission.exam_id, true);
      return NextResponse.json({ submission, exam, type: "exam" });
    }

    const kind = searchParams.get("kind") ?? "all";
    const className = (searchParams.get("class") ?? "").trim();
    const searchQuery = (searchParams.get("q") ?? "").trim();
    const mode = (searchParams.get("mode") ?? "").trim();
    const correctFilter = (searchParams.get("correct") ?? "").trim();
    const status = (searchParams.get("status") ?? "").trim();
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") ?? "25"), 1), 100);

    const [practiceRowsRaw, examRowsRaw] = await Promise.all([
      (db.from("submissions") as any)
        .select("id, student_id, question_id, mode, correct, points, created_at")
        .order("created_at", { ascending: false }),
      (db.from("exam_submissions") as any)
        .select("id, exam_id, student_id, student_name, total_score, status, created_at")
        .order("created_at", { ascending: false }),
    ]);

    const practiceRows = practiceRowsRaw?.data ?? [];
    const examRows = examRowsRaw?.data ?? [];

    const questionIds = Array.from(new Set((practiceRows as Array<Record<string, unknown>>).map((row) => String((row as any).question_id ?? "")).filter(Boolean)));
    const examIds = Array.from(new Set((examRows as Array<Record<string, unknown>>).map((row) => String((row as any).exam_id ?? "")).filter(Boolean)));

    const [questionsRaw, studentsRaw, examsRaw] = (await Promise.all([
      questionIds.length > 0 ? (db.from("questions") as any).select("id, data").in("id", questionIds) : Promise.resolve({ data: [] }),
      studentIdsFromRows([...practiceRows, ...examRows]),
      examIds.length > 0 ? (db.from("exams") as any).select("id, title, max_score").in("id", examIds) : Promise.resolve({ data: [] }),
    ])) as Array<{ data?: any[] }>;

    const questionMap = new Map((questionsRaw?.data ?? []).map((row: any) => [String(row.id), row]));
    const examMap = new Map((examsRaw?.data ?? []).map((row: any) => [String(row.id), row]));
    const studentMap = new Map((studentsRaw?.data ?? []).map((row: any) => [String(row.id), row]));

    const merged: Array<Record<string, unknown>> = [];

    for (const row of practiceRows) {
      const student = studentMap.get(String((row as any).student_id ?? ""));
      const question = questionMap.get(String((row as any).question_id ?? ""));
      const displayTitle = question?.data?.title ?? (question?.data?.scenario ? String(question.data.scenario).slice(0, 80) : String((row as any).question_id ?? "Câu luyện tập"));

      merged.push({
        id: `algo-${(row as any).id}`,
        kind: "algo",
        examId: null,
        studentId: (row as any).student_id,
        studentName: student?.name ?? (row as any).student_id,
        className: student?.class ?? "",
        title: displayTitle,
        examTitle: displayTitle,
        totalScore: Number((row as any).points ?? 0),
        score: Number((row as any).points ?? 0),
        status: (row as any).correct ? "đúng" : "sai",
        createdAt: (row as any).created_at,
        mode: (row as any).mode,
        correct: Boolean((row as any).correct),
        maxScore: null,
      });
    }

    for (const row of examRows) {
      const student = studentMap.get(String((row as any).student_id ?? ""));
      const exam = examMap.get(String((row as any).exam_id ?? ""));

      merged.push({
        id: `exam-${(row as any).id}`,
        kind: "exam",
        examId: (row as any).exam_id,
        studentId: (row as any).student_id,
        studentName: (row as any).student_name ?? student?.name ?? (row as any).student_id,
        className: student?.class ?? "",
        title: exam?.title ?? (row as any).exam_id,
        examTitle: exam?.title ?? (row as any).exam_id,
        totalScore: Number((row as any).total_score ?? 0),
        score: Number((row as any).total_score ?? 0),
        status: (row as any).status ?? "submitted",
        createdAt: (row as any).created_at,
        mode: "exam",
        correct: null,
        maxScore: Number(exam?.max_score ?? 0) || null,
      });
    }

    const fromDate = toDateValue(from);
    const toDate = toDateValue(to);

    const filtered = merged.filter((item) => {
      const itemKind = String((item as any).kind ?? "");
      const itemMode = String((item as any).mode ?? "");
      const itemStatus = String((item as any).status ?? "");
      const itemStudentName = String((item as any).studentName ?? "");
      const itemClass = String((item as any).className ?? "");
      const itemTitle = String((item as any).title ?? "");
      const itemCreatedAt = new Date(String((item as any).createdAt ?? "")).getTime();

      if (kind !== "all" && itemKind !== kind) return false;
      if (className && !normalizeSearchText(itemClass).includes(normalizeSearchText(className))) return false;
      if (searchQuery && ![itemStudentName, itemTitle].some((value) => normalizeSearchText(String(value)).includes(normalizeSearchText(searchQuery)))) return false;
      if (mode && itemKind === "algo" && itemMode !== mode) return false;
      if (correctFilter && itemKind === "algo" && String(Boolean((item as any).correct)) !== correctFilter) return false;
      if (status && itemKind === "exam" && itemStatus !== status) return false;
      if (fromDate && itemCreatedAt < fromDate.getTime()) return false;
      if (toDate && itemCreatedAt > toDate.getTime()) return false;
      return true;
    });

    filtered.sort((a, b) => new Date(String((b as any).createdAt ?? "")).getTime() - new Date(String((a as any).createdAt ?? "")).getTime());

    const total = filtered.length;
    const offset = (page - 1) * pageSize;
    const pageItems = filtered.slice(offset, offset + pageSize);

    return NextResponse.json({
      submissions: pageItems,
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

async function studentIdsFromRows(rows: Array<Record<string, unknown>>) {
  const ids = Array.from(new Set(
    rows
      .map((row) => String((row as any).student_id ?? ""))
      .filter(Boolean)
  ));

  if (ids.length === 0) {
    return { data: [] };
  }

  const db = supabaseAdmin();
  return (db.from("students") as any).select("id, name, class").in("id", ids);
}
