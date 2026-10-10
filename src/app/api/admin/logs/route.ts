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
    const action = searchParams.get("action")?.trim();

    const query = (db.from("admin_actions") as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    const result = action ? query.eq("action", action) : query;
    const { data, error } = await result;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
