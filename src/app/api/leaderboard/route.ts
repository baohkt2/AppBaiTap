import { NextRequest, NextResponse } from "next/server";
import { getStudentId } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const studentId = await getStudentId();
  if (!studentId) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "all";

  const db = supabaseAdmin();

  // Get student info for class filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: studentData } = await (db.from("students") as any)
    .select("class")
    .eq("id", studentId)
    .single();

  // Query leaderboard view
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db.from("leaderboard") as any)
    .select("name, class, total")
    .order("total", { ascending: false })
    .limit(50);

  if (scope === "class" && studentData?.class) {
    query = query.eq("class", studentData.class);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ error: "Lỗi tải bảng xếp hạng" }, { status: 500 });
  }

  return NextResponse.json({
    leaderboard: data ?? [],
    studentId,
    studentClass: studentData?.class ?? "",
  });
}
