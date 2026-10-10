import "server-only";

import { supabaseAdmin } from "@/lib/supabase";

export async function logAdminAction(action: string, target: Record<string, unknown>, note?: string) {
  try {
    const db = supabaseAdmin();
    const table = db.from("admin_actions") as unknown as {
      insert: (payload: Record<string, unknown>) => Promise<unknown>;
    };

    await table.insert({
      action,
      target,
      note: note ?? null,
    });
  } catch (error) {
    console.error("[admin-log] failed to record action:", error);
  }
}
