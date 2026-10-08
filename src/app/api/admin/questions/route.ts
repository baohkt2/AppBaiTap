import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { questionSchema } from "@/lib/schema";
import { validateFlowchart } from "@/lib/flowchart/validate";

export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "pending";

  const db = supabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from("questions") as any)
    .select("id, mode, type, data, status, created_at")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ questions: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }

  const body = await req.json();
  const { id, action, data: newData } = body;

  if (!id || !action) {
    return NextResponse.json({ error: "Thiếu tham số" }, { status: 400 });
  }

  const db = supabaseAdmin();

  if (action === "approve") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db.from("questions") as any)
      .update({ status: "approved" })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "reject" || action === "delete") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db.from("questions") as any).delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "unpublish") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db.from("questions") as any)
      .update({ status: "pending" })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "update" && newData) {
    // Validate the new data
    const parsed = questionSchema.safeParse(newData);
    if (!parsed.success) {
      return NextResponse.json({
        error: "Dữ liệu không hợp lệ",
        issues: parsed.error.issues.map((e) => e.message),
      }, { status: 400 });
    }

    const flowErrors = validateFlowchart(parsed.data);
    if (flowErrors.length > 0) {
      return NextResponse.json({
        error: "Sơ đồ không hợp lệ",
        issues: flowErrors,
      }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db.from("questions") as any)
      .update({
        data: parsed.data,
        mode: parsed.data.mode,
        type: parsed.data.structure,
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action không hợp lệ" }, { status: 400 });
}
