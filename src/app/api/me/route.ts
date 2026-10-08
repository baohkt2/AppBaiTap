import { NextResponse } from "next/server";
import { getStudentId } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const studentId = await getStudentId();
  if (!studentId) {
    return NextResponse.json({ student: null }, { status: 401 });
  }

  const db = supabaseAdmin();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from("students") as any)
    .select("id, name, class")
    .eq("id", studentId)
    .single();

  if (error || !data) {
    return NextResponse.json({ student: null }, { status: 401 });
  }

  // Get total points
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pointsData } = await (db.from("attempts") as any)
    .select("points")
    .eq("student_id", studentId);

  const totalPoints = (pointsData ?? []).reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, row: any) => sum + (row.points ?? 0),
    0
  );

  return NextResponse.json({
    student: {
      id: data.id,
      name: data.name,
      class: data.class,
      totalPoints,
    },
  });
}
