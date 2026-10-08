/**
 * Seed script: loads seed-questions.json into Supabase with status = 'approved'.
 *
 * Usage: npx tsx scripts/seed.ts
 *
 * Requires .env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

config(); // Load .env

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function seed() {
  const filePath = resolve(__dirname, "../data/seed-questions.json");
  const raw = JSON.parse(readFileSync(filePath, "utf-8"));

  console.log(`📦 Loading ${raw.length} questions...`);

  for (const q of raw) {
    const row = {
      id: q.id,
      lesson: q.lesson ?? 16,
      mode: q.mode,
      type: q.structure, // DB column is 'type', schema field is 'structure'
      data: q,
      status: "approved",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("questions") as any).upsert(row, {
      onConflict: "id",
    });

    if (error) {
      console.error(`  ❌ ${q.id}: ${error.message}`);
    } else {
      console.log(`  ✅ ${q.id}: ${q.title}`);
    }
  }

  console.log("🎉 Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
