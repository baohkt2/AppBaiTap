import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { callGemini } from "@/lib/gemini";
import { buildExamGeneratePrompt } from "@/lib/prompts";
import { examSchema } from "@/lib/schema";
import { saveExamDraft } from "@/lib/exams";

export const maxDuration = 60;

function stripMetaLanguage(value: string): string {
  return value.replace(/^(\s*(theo|dựa trên|từ)\s+(tài liệu|nguồn|đoạn văn|bài đọc)[,:\-\s]*)+/i, "").trim();
}

function sanitizeExamPayload(input: unknown): unknown {
  if (typeof input === "string") {
    return stripMetaLanguage(input);
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeExamPayload(item));
  }

  if (input && typeof input === "object") {
    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>).map(([key, value]) => [key, sanitizeExamPayload(value)])
    );
  }

  return input;
}

type GeneratePayload = FormData | {
  documentText?: string;
  count?: string | number;
  mcqRatio?: string | number;
  difficulties?: {
    nhan_biet?: string | number;
    thong_hieu?: string | number;
    van_dung?: string | number;
  };
  nhan_biet?: string | number;
  thong_hieu?: string | number;
  van_dung?: string | number;
  file?: File;
};

async function extractSourceDocument(payload: GeneratePayload) {
  if (payload instanceof FormData) {
    const textValue = payload.get("documentText");
    if (typeof textValue === "string" && textValue.trim()) {
      return { documentText: textValue.trim() };
    }

    const fileValue = payload.get("file");
    if (fileValue instanceof File) {
      const fileName = fileValue.name.toLowerCase();
      const buffer = Buffer.from(await fileValue.arrayBuffer());

      if (fileName.endsWith(".pdf") || fileValue.type === "application/pdf") {
        const pdfModule = await import("pdf-parse");
        const pdfParse = (pdfModule as unknown as { default: (input: Buffer) => Promise<{ text: string }> }).default;
        const result = await pdfParse(buffer);
        return { documentText: result.text.trim() };
      }

      if (fileName.endsWith(".docx") || fileName.endsWith(".doc") || fileValue.type.includes("word")) {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        return { documentText: result.value.trim() };
      }

      return { documentText: (await fileValue.text()).trim() };
    }
  }

  const textPayload = payload as Exclude<GeneratePayload, FormData>;
  const textValue = textPayload.documentText;
  if (typeof textValue === "string" && textValue.trim()) {
    return { documentText: textValue.trim() };
  }

  throw new Error("Thiếu tài liệu nguồn");
}

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";
    const payload: GeneratePayload = contentType.includes("multipart/form-data") ? await req.formData() : await req.json();
    const fields = payload instanceof FormData ? {
      count: payload.get("count"),
      mcqRatio: payload.get("mcqRatio"),
      difficulties: {
        nhan_biet: payload.get("nhan_biet"),
        thong_hieu: payload.get("thong_hieu"),
        van_dung: payload.get("van_dung"),
      },
    } : payload;

    const count = Number(fields.count ?? 10) || 10;
    const mcqRatio = Number(fields.mcqRatio ?? 0.8) || 0.8;
    const difficulties = {
      nhan_biet: Number(fields.difficulties?.nhan_biet ?? 4) || 4,
      thong_hieu: Number(fields.difficulties?.thong_hieu ?? 4) || 4,
      van_dung: Number(fields.difficulties?.van_dung ?? 2) || 2,
    };

    const { documentText } = await extractSourceDocument(payload);

    const { system, user } = buildExamGeneratePrompt(documentText, { count, mcqRatio, difficulties });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await callGemini<any>({
      systemPrompt: system,
      userPrompt: user,
      temperature: 0.7,
      responseSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          timeLimit: { type: "number", nullable: true },
          maxScore: { type: "number" },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                type: { type: "string", enum: ["mcq", "essay"] },
                difficulty: { type: "string", enum: ["nhan_biet", "thong_hieu", "van_dung"] },
                content: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                correctAnswer: { type: "string" },
                explanation: { type: "string" },
                scoreWeight: { type: "number" }
              },
              required: ["id", "type", "difficulty", "content", "correctAnswer", "scoreWeight"]
            }
          }
        },
        required: ["title", "maxScore", "questions"]
      }
    });

    const sanitized = sanitizeExamPayload(raw);
    const parsed = examSchema.safeParse(sanitized);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
      return NextResponse.json({ error: "AI trả về dữ liệu không hợp lệ", details: errors }, { status: 500 });
    }

    const db = supabaseAdmin();
    const examId = await saveExamDraft(db, parsed.data);

    return NextResponse.json({ examId, data: parsed.data, status: "draft" });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
