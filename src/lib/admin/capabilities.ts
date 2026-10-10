import { supabaseAdmin } from "@/lib/supabase";

export async function getFeatureCapabilities(db = supabaseAdmin()) {
  const capabilityChecks = await Promise.all([
    (db.from("submissions") as any).select("id").limit(1).then(({ error }: { error?: { message?: string } }) => ({ ok: !error, value: "submissions" })).catch(() => ({ ok: false, value: "submissions" })),
    (db.from("exam_starts") as any).select("exam_id").limit(1).then(({ error }: { error?: { message?: string } }) => ({ ok: !error, value: "exam_starts" })).catch(() => ({ ok: false, value: "exam_starts" })),
    (db.from("exam_submissions") as any).select("duration_sec,is_late").limit(1).then(({ error }: { error?: { message?: string } }) => ({ ok: !error, value: "duration_sec" })).catch(() => ({ ok: false, value: "duration_sec" })),
    (db.from("admin_actions") as any).select("id").limit(1).then(({ error }: { error?: { message?: string } }) => ({ ok: !error, value: "admin_actions" })).catch(() => ({ ok: false, value: "admin_actions" })),
  ]);

  return {
    hasSubmissions: capabilityChecks[0].ok,
    hasExamStarts: capabilityChecks[1].ok,
    hasLateFlags: capabilityChecks[2].ok,
    hasAdminActions: capabilityChecks[3].ok,
  };
}
