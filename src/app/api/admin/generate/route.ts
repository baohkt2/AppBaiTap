import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { callGemini } from "@/lib/gemini";
import { buildGeneratePrompt } from "@/lib/prompts";
import { questionSchema } from "@/lib/schema";
import { validateFlowchart } from "@/lib/flowchart/validate";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }

  const body = await req.json();
  const { modes = [], structures = [], count = 1, theme = "" } = body;

  // Fallback for older clients sending single 'mode' or 'structure'
  const modeList = modes.length > 0 ? modes : (body.mode ? [body.mode] : []);
  const structureList = structures.length > 0 ? structures : (body.structure ? [body.structure] : []);

  if (modeList.length === 0 || structureList.length === 0 || count < 1 || count > 5) {
    return NextResponse.json({ error: "Tham số không hợp lệ" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Get existing titles to avoid duplicates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingQuestions } = await (db.from("questions") as any)
    .select("data")
    .order("created_at", { ascending: false })
    .limit(100);

  const existingTitles = (existingQuestions ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((q: any) => q.data?.title)
    .filter(Boolean) as string[];

  const results: Array<{ id: string; title: string; success: boolean; errors?: string[] }> = [];

  // Generate one at a time (sequential to avoid Vercel timeout)
  for (let i = 0; i < count; i++) {
    let success = false;
    let lastErrors: string[] = [];
    
    const currentMode = modeList[Math.floor(Math.random() * modeList.length)];
    const currentStructure = structureList[Math.floor(Math.random() * structureList.length)];

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { system, user } = buildGeneratePrompt(
          currentMode,
          currentStructure,
          theme,
          [...existingTitles, ...results.map((r) => r.title)]
        );

        // If retrying, append error feedback
        const retryHint =
          attempt > 0
            ? `\n\nLần trước bạn tạo sai. Lỗi: ${lastErrors.join("; ")}. Hãy sửa lại.`
            : "";

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = await callGemini<any>({
          systemPrompt: system + retryHint,
          userPrompt: user,
          temperature: 0.4,
        });

        // Assign a generated ID
        const questionId = `${currentStructure.slice(0, 2)}-${currentMode.slice(0, 2)}-${Date.now()}-${i}`;
        raw.id = questionId;
        raw.lesson = 16;
        raw.mode = currentMode;
        raw.structure = currentStructure;

        // Validate with zod
        const parsed = questionSchema.safeParse(raw);
        if (!parsed.success) {
          lastErrors = parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
          continue;
        }

        // Validate flowchart
        const flowErrors = validateFlowchart(parsed.data);
        if (flowErrors.length > 0) {
          lastErrors = flowErrors;
          continue;
        }

        // Save to DB as pending
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: dbError } = await (db.from("questions") as any).insert({
          id: questionId,
          lesson: 16,
          mode: currentMode,
          type: currentStructure,
          data: parsed.data,
          status: "pending",
        });

        if (dbError) {
          lastErrors = [dbError.message];
          continue;
        }

        results.push({ id: questionId, title: parsed.data.title, success: true });
        success = true;
        break;
      } catch (err) {
        lastErrors = [(err as Error).message ?? "Unknown error"];
      }
    }

    if (!success) {
      results.push({
        id: "",
        title: `Câu ${i + 1} thất bại`,
        success: false,
        errors: lastErrors,
      });
    }
  }

  return NextResponse.json({ results });
}
