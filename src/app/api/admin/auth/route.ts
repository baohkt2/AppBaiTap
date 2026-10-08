import { NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { createAdminSession, setAdminCookie, verifyAdminSession } from "@/lib/session";
import { timingSafeEqual } from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const password = body.password ?? "";

  const env = serverEnv();
  const expected = Buffer.from(env.ADMIN_PASSWORD, "utf8");
  const actual = Buffer.from(password, "utf8");

  let isValid = false;
  if (expected.length === actual.length) {
    isValid = timingSafeEqual(expected, actual);
  }

  if (!isValid) {
    return NextResponse.json({ error: "Mật khẩu sai" }, { status: 401 });
  }

  const token = await createAdminSession();
  await setAdminCookie(token);

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const isAdmin = await verifyAdminSession();
  return NextResponse.json({ admin: isAdmin });
}
