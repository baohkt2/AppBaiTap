import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { listExamSummaries, loadExamById } from "@/lib/exams";

export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }

  try {
    const db = supabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const exam = await loadExamById(db, id, true);
      if (!exam) {
        return NextResponse.json({ error: "Không tìm thấy đề thi" }, { status: 404 });
      }

      return NextResponse.json({ exam });
    }

    const exams = await listExamSummaries(db, true);
    return NextResponse.json({ exams });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, action } = body as { id?: string; action?: string };

    if (!id || !action) {
      return NextResponse.json({ error: "Thiếu tham số" }, { status: 400 });
    }

    const db = supabaseAdmin();

    if (action === "publish" || action === "unpublish") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db.from("exams") as any)
        .update({ status: action === "publish" ? "published" : "draft" })
        .eq("id", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
      // Delete dependents first for compatibility across databases without cascade rules.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db.from("exam_submissions") as any).delete().eq("exam_id", id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db.from("exam_questions") as any).delete().eq("exam_id", id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db.from("exams") as any).delete().eq("id", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Action không hợp lệ" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}