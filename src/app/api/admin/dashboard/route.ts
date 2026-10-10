import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { dashboardQuerySchema, dashboardResponseSchema } from "@/lib/admin/dashboard-schema";
import { getFeatureCapabilities } from "@/lib/admin/capabilities";
import { fillMissingDays, percentChange, resolveRange } from "@/lib/admin/dashboard-utils";

export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const parsed = dashboardQuerySchema.safeParse({
      range: searchParams.get("range") ?? "7d",
      class: searchParams.get("class") ?? "all",
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Tham số không hợp lệ" }, { status: 400 });
    }

    const db = supabaseAdmin();
    const capabilities = await getFeatureCapabilities(db);
    const { start, end, previousStart, previousEnd } = resolveRange(parsed.data.range, new Date());
    const classFilter = parsed.data.class === "all" ? null : parsed.data.class;

    const [students, questions, attempts, submissions, examSubmissions, judgeCalls] = await Promise.all([
      (db.from("students") as any).select("id, name, class").order("name", { ascending: true }),
      (db.from("questions") as any).select("id, status, mode, data").order("created_at", { ascending: false }),
      (db.from("attempts") as any).select("student_id, question_id, points, correct, created_at").order("created_at", { ascending: false }),
      capabilities.hasSubmissions ? (db.from("submissions") as any).select("id, student_id, question_id, mode, answer, correct, points, created_at").order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
      (db.from("exam_submissions") as any).select("id, student_id, total_score, created_at, duration_sec, is_late, status").order("created_at", { ascending: false }),
      (db.from("judge_calls") as any).select("id, student_id, created_at").order("created_at", { ascending: false }),
    ]);

    const studentList = (students.data ?? []) as Array<{ id: string; name: string; class: string }>;
    const filteredStudents = classFilter ? studentList.filter((student) => student.class === classFilter) : studentList;
    const filteredStudentIds = new Set(filteredStudents.map((student) => student.id));

    const practiceRows = capabilities.hasSubmissions
      ? ((submissions.data ?? []) as Array<any>).filter((row) => {
          if (!filteredStudentIds.has(String(row.student_id ?? ""))) return false;
          return new Date(row.created_at) >= start && new Date(row.created_at) <= end;
        })
      : ((attempts.data ?? []) as Array<any>).filter((row) => {
          if (!filteredStudentIds.has(String(row.student_id ?? ""))) return false;
          return new Date(row.created_at) >= start && new Date(row.created_at) <= end;
        });

    const examRows = ((examSubmissions.data ?? []) as Array<any>).filter((row) => {
      if (!filteredStudentIds.has(String(row.student_id ?? ""))) return false;
      return new Date(row.created_at) >= start && new Date(row.created_at) <= end;
    });

    const activeStudents = new Set([
      ...practiceRows.map((row) => String(row.student_id)),
      ...examRows.map((row) => String(row.student_id)),
    ]).size;

    let practiceCorrect = 0;
    for (const row of practiceRows) {
      if (row.correct === true || row.correct === "true") practiceCorrect += 1;
    }

    const practiceAccuracy = practiceRows.length ? Number(((practiceCorrect / practiceRows.length) * 100).toFixed(1)) : 0;
    const examAverage = examRows.length ? Number((examRows.reduce((sum: number, row: any) => sum + Number(row.total_score ?? 0), 0) / examRows.length).toFixed(1)) : 0;

    const dailyActivityRows = [
      ...((submissions.data ?? []).map((row: any) => ({
        date: new Date(row.created_at).toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }),
        value: 1,
        type: "practice",
      })) ?? []),
      ...((examSubmissions.data ?? []).map((row: any) => ({
        date: new Date(row.created_at).toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }),
        value: 1,
        type: "exam",
      })) ?? []),
    ];

    const dailyActivityMap: Record<string, { practice: number; exams: number }> = {};
    for (const row of dailyActivityRows) {
      const key = row.date;
      dailyActivityMap[key] ??= { practice: 0, exams: 0 };
      if (row.type === "practice") dailyActivityMap[key].practice += row.value;
      else dailyActivityMap[key].exams += row.value;
    }

    const dailyActivity = fillMissingDays(
      Object.entries(dailyActivityMap).map(([date, values]) => ({ date, value: values.practice + values.exams })),
      start,
      end
    ).map((item) => ({
      date: item.date,
      practice: dailyActivityMap[item.date]?.practice ?? 0,
      exams: dailyActivityMap[item.date]?.exams ?? 0,
    }));

    const hardestQuestions = (questions.data ?? [])
      .filter((question: any) => question.status === "approved")
      .slice(0, 5)
      .map((question: any) => ({
        id: String(question.id),
        title: String(question.data?.title ?? question.id),
        mode: String(question.mode ?? ""),
        attempts: 0,
        correctRate: 0,
      }));

    const topStudents = filteredStudents
      .slice(0, 5)
      .map((student) => ({
        id: student.id,
        name: student.name,
        className: student.class,
        total: (attempts.data ?? []).filter((row: any) => row.student_id === student.id).reduce((sum: number, row: any) => sum + Number(row.points ?? 0), 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const recentActivity = [...(submissions.data ?? []).map((row: any) => ({
      id: String(row.id),
      kind: "practice",
      studentName: studentList.find((student) => student.id === row.student_id)?.name ?? row.student_id,
      className: studentList.find((student) => student.id === row.student_id)?.class ?? "",
      title: String(row.question_id ?? "Câu luyện tập"),
      score: Number(row.points ?? 0),
      createdAt: row.created_at,
    })), ...(examSubmissions.data ?? []).map((row: any) => ({
      id: String(row.id),
      kind: "exam",
      studentName: studentList.find((student) => student.id === row.student_id)?.name ?? row.student_id,
      className: studentList.find((student) => student.id === row.student_id)?.class ?? "",
      title: String(row.status ?? "Bài thi"),
      score: Number(row.total_score ?? 0),
      createdAt: row.created_at,
    }))].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

    const alerts = [
      {
        id: "late",
        type: "late",
        label: "Nộp muộn",
        count: capabilities.hasLateFlags ? (examRows.filter((row: any) => row.is_late === true)).length : 0,
      },
      {
        id: "fast",
        type: "fast",
        label: "Nộp quá nhanh",
        count: examRows.filter((row: any) => Number(row.duration_sec ?? 0) > 0 && Number(row.duration_sec ?? 0) < 10).length,
      },
    ];

    const previousPractice = ((attempts.data ?? []) as Array<any>).filter((row) => {
      const dt = new Date(row.created_at);
      return dt >= previousStart && dt <= previousEnd && filteredStudentIds.has(String(row.student_id));
    });

    const currentPracticeCount = practiceRows.length;
    const previousPracticeCount = previousPractice.length;
    const kpis = {
      activeStudents: { value: activeStudents, delta: percentChange(activeStudents, filteredStudents.length || 1) },
      practiceCount: { value: currentPracticeCount, delta: percentChange(currentPracticeCount, previousPracticeCount) },
      examCount: { value: examRows.length, delta: percentChange(examRows.length, 0) },
      pendingQuestions: { value: (questions.data ?? []).filter((question: any) => question.status === "pending").length, delta: 0 },
      geminiToday: { value: (judgeCalls.data ?? []).filter((item: any) => { const d = new Date(item.created_at); return d >= new Date(new Date().setHours(0, 0, 0, 0)); }).length, delta: 0 },
    };

    const payload = {
      summary: {
        activeStudents: kpis.activeStudents.value,
        totalStudents: filteredStudents.length,
        practiceCount: kpis.practiceCount.value,
        practiceAccuracy,
        examCount: examRows.length,
        averageExamScore: examAverage,
        pendingQuestions: kpis.pendingQuestions.value,
        geminiToday: kpis.geminiToday.value,
      },
      dailyActivity: dailyActivity.slice(0, 90),
      hardestQuestions,
      topStudents,
      recentActivity,
      alerts,
      meta: {
        generatedAt: new Date().toISOString(),
        range: parsed.data.range,
        class: parsed.data.class,
        capabilities,
      },
    };

    const validated = dashboardResponseSchema.safeParse(payload);
    if (!validated.success) {
      return NextResponse.json({ error: "Payload dashboard không hợp lệ", issues: validated.error.issues }, { status: 500 });
    }

    return NextResponse.json(validated.data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
