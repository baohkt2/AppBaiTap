import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { logAdminAction } from "@/lib/admin-log";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const db = supabaseAdmin();

    const { data: student, error: studentError } = await (db.from("students") as any)
      .select("id, name, class, created_at")
      .eq("id", id)
      .maybeSingle();

    if (studentError) {
      return NextResponse.json({ error: studentError.message }, { status: 500 });
    }

    if (!student) {
      return NextResponse.json({ error: "Không tìm thấy học sinh" }, { status: 404 });
    }

    const [{ data: attempts = [] }, { data: examSubmissions = [] }, { data: recentAttempts = [] }] = await Promise.all([
      (db.from("attempts") as any).select("points, correct, question_id, created_at").eq("student_id", id),
      (db.from("exam_submissions") as any).select("id, exam_id, total_score, status, created_at").eq("student_id", id).order("created_at", { ascending: false }),
      (db.from("submissions") as any).select("id, question_id, points, correct, created_at").eq("student_id", id).order("created_at", { ascending: false }).limit(10),
    ]);

    return NextResponse.json({
      student,
      stats: {
        totalPractice: attempts.reduce((sum: number, row: any) => sum + Number(row.points ?? 0), 0),
        practiceCount: attempts.length,
        examCount: examSubmissions.length,
        recentAttempts: recentAttempts.length,
      },
      exams: examSubmissions,
      attempts,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const className = String(body.class ?? "").trim();

    if (!name || !className) {
      return NextResponse.json({ error: "Tên và lớp không được để trống" }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { error } = await (db.from("students") as any)
      .update({ name, class: className })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAction("rename_student", { studentId: id, name, className }, "Cập nhật thông tin học sinh");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const rawBody = await req.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const confirmName = String(body.confirmName ?? "").trim();

    const db = supabaseAdmin();
    const { data: student } = await (db.from("students") as any).select("name").eq("id", id).maybeSingle();

    if (!student || (confirmName && confirmName !== student.name)) {
      return NextResponse.json({ error: "Xác nhận tên học sinh không đúng" }, { status: 400 });
    }

    await (db.from("submissions") as any).delete().eq("student_id", id);
    await (db.from("judge_calls") as any).delete().eq("student_id", id);
    await (db.from("attempts") as any).delete().eq("student_id", id);
    await (db.from("exam_submissions") as any).delete().eq("student_id", id);
    await (db.from("exam_starts") as any).delete().eq("student_id", id);

    const { error } = await (db.from("students") as any).delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAction("delete_student", { studentId: id }, "Xóa tài khoản học sinh và dữ liệu liên quan");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
