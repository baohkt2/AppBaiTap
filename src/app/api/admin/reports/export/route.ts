import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

function escapeCsv(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }

  try {
    const db = supabaseAdmin();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "summary";

    if (type === "detail") {
      const { data, error } = await (db.from("admin_submissions_view") as any).select("*").order("created_at", { ascending: false }).limit(1000);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const headers = ["kind", "id", "student_id", "student_name", "class_name", "title", "sub_type", "score", "max_score", "correct", "status", "created_at"];
      const rows = [headers, ...(data ?? []).map((row: any) => headers.map((header) => row[header] ?? ""))];
      const csv = rows.map((line) => line.map(escapeCsv).join(",")).join("\n");

      return new NextResponse(`\uFEFF${csv}`, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="admin-detail-report.csv"',
        },
      });
    }

    const { data: students, error: studentsError } = await (db.from("students") as any).select("id, name, class").order("name", { ascending: true });
    if (studentsError) {
      return NextResponse.json({ error: studentsError.message }, { status: 500 });
    }

    const { data: attempts = [] } = await (db.from("attempts") as any).select("student_id, points");
    const { data: exams = [] } = await (db.from("exam_submissions") as any).select("student_id, total_score");

    const attemptMap = new Map<string, number>();
    for (const row of attempts as any[]) {
      attemptMap.set(String(row.student_id), (attemptMap.get(String(row.student_id)) ?? 0) + Number(row.points ?? 0));
    }

    const summaryRows = (students ?? []).map((student: any) => {
      const studentExams = (exams as any[]).filter((row: any) => row.student_id === student.id);
      return {
        name: student.name,
        class: student.class,
        totalPractice: attemptMap.get(student.id) ?? 0,
        totalExam: studentExams.reduce((sum: number, row: any) => sum + Number(row.total_score ?? 0), 0),
        examCount: studentExams.length,
      };
    });

    const headers = ["name", "class", "totalPractice", "totalExam", "examCount"];
    const rows = [headers, ...summaryRows.map((row: Record<string, unknown>) => headers.map((header) => row[header] ?? ""))];
    const csv = rows.map((line) => line.map(escapeCsv).join(",")).join("\n");

    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="admin-summary-report.csv"',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
