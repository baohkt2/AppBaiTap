import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import {
  normalizeKey,
  capitalizeWords,
} from "@/lib/normalize";
import { createStudentSession, setSessionCookie } from "@/lib/session";

const loginSchema = z.object({
  name: z
    .string()
    .min(2, "Họ tên phải có ít nhất 2 ký tự")
    .max(50, "Họ tên tối đa 50 ký tự")
    .refine((v) => v.trim().length >= 2, "Họ tên không được để trống"),
  class: z
    .string()
    .min(1, "Lớp không được để trống")
    .max(10, "Lớp tối đa 10 ký tự")
    .refine((v) => v.trim().length >= 1, "Lớp không được để trống"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues?.[0];
      return NextResponse.json(
        { error: firstIssue?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    const { name, class: cls } = parsed.data;
    const id = normalizeKey(name, cls);

    // Capitalize words if all lowercase
    const displayName = capitalizeWords(name);
    const displayClass = cls.trim().toUpperCase();

    const db = supabaseAdmin();

    // Upsert: keep original name/class from first login
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db.from("students") as any).upsert(
      {
        id,
        name: displayName,
        class: displayClass,
      },
      {
        onConflict: "id",
        ignoreDuplicates: true, // keep first-inserted name/class
      }
    );

    if (error) {
      console.error("Supabase upsert error:", error);
      return NextResponse.json(
        { error: "Lỗi hệ thống, vui lòng thử lại" },
        { status: 500 }
      );
    }

    // Create session token and set cookie
    const token = await createStudentSession(id);
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, studentId: id });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Lỗi hệ thống, vui lòng thử lại" },
      { status: 500 }
    );
  }
}
