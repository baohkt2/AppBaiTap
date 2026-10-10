import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }

  try {
    const db = supabaseAdmin();
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") ?? "").trim().toLowerCase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: studentsRaw, error: studentsError } = await (db.from("students") as any)
      .select("id, name, class, created_at")
      .order("created_at", { ascending: false });

    if (studentsError) {
      return NextResponse.json({ error: studentsError.message }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: attemptRows } = await (db.from("attempts") as any)
      .select("student_id, points");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: examSubmissionRows } = await (db.from("exam_submissions") as any)
      .select("student_id, total_score");

    const pointsMap = new Map<string, number>();
    for (const row of attemptRows ?? []) {
      const studentId = String((row as any).student_id ?? "");
      pointsMap.set(studentId, (pointsMap.get(studentId) ?? 0) + Number((row as any).points ?? 0));
    }

    const examCountMap = new Map<string, number>();
    for (const row of examSubmissionRows ?? []) {
      const studentId = String((row as any).student_id ?? "");
      examCountMap.set(studentId, (examCountMap.get(studentId) ?? 0) + 1);
    }

    const students = (studentsRaw ?? [])
      .map((row: any) => ({
        id: row.id,
        name: row.name,
        class: row.class,
        createdAt: row.created_at ?? null,
        totalPoints: pointsMap.get(row.id) ?? 0,
        practiceCount: (attemptRows ?? []).filter((attempt: any) => attempt.student_id === row.id).length,
        examCount: examCountMap.get(row.id) ?? 0,
      }))
      .filter((row: any) => {
        if (!query) return true;
        return [row.id, row.name, row.class].some((value) => String(value ?? "").toLowerCase().includes(query));
      });

    return NextResponse.json({ students });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
