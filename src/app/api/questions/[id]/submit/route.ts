import { NextRequest, NextResponse } from "next/server";
import { getStudentId } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { questionSchema, sapXepAnswerSchema, dienKhuyetAnswerSchema, tuDoAnswerSchema } from "@/lib/schema";
import { gradeSapXep, gradeDienKhuyet } from "@/lib/grading";
import { checkAndRecordJudgeCall, judgeDienKhuyet, judgeTuDo } from "@/lib/judge";
import { validateFlowchart } from "@/lib/flowchart/validate";
import { POINTS } from "@/lib/config";

export const maxDuration = 60;

// Simple in-memory rate limiter
const submitTimestamps = new Map<string, number[]>();

function checkRateLimit(studentId: string): boolean {
  const now = Date.now();
  const timestamps = submitTimestamps.get(studentId) ?? [];
  const recent = timestamps.filter((t) => now - t < 60_000);
  if (recent.length >= 10) return false;
  recent.push(now);
  submitTimestamps.set(studentId, recent);
  return true;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const studentId = await getStudentId();
  if (!studentId) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  if (!checkRateLimit(studentId)) {
    return NextResponse.json(
      { error: "Em gửi bài quá nhanh, chờ một chút nhé" },
      { status: 429 }
    );
  }

  const { id: questionId } = await params;
  const db = supabaseAdmin();

  // Fetch question
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: qRow, error: qErr } = await (db.from("questions") as any)
    .select("data, status")
    .eq("id", questionId)
    .eq("status", "approved")
    .single();

  if (qErr || !qRow) {
    return NextResponse.json({ error: "Không tìm thấy câu hỏi" }, { status: 404 });
  }

  const parsed = questionSchema.safeParse(qRow.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu câu hỏi bị lỗi" }, { status: 500 });
  }
  const question = parsed.data;

  // Check if already completed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingAttempt } = await (db.from("attempts") as any)
    .select("correct")
    .eq("student_id", studentId)
    .eq("question_id", questionId)
    .single();

  const body = await req.json();

  let correct = false;
  let wrongNodeIds: string[] = [];
  let wrongEdgeIds: string[] = [];
  let message = "";
  let pointsAwarded = 0;

  if (question.mode === "sap_xep") {
    const answerParsed = sapXepAnswerSchema.safeParse(body.answer);
    if (!answerParsed.success) {
      return NextResponse.json({ error: "Dữ liệu bài làm không hợp lệ" }, { status: 400 });
    }
    const result = gradeSapXep(question, answerParsed.data);
    correct = result.correct;
    wrongNodeIds = result.wrongNodeIds;
  } else if (question.mode === "dien_khuyet") {
    const answerParsed = dienKhuyetAnswerSchema.safeParse(body.answer);
    if (!answerParsed.success) {
      return NextResponse.json({ error: "Dữ liệu bài làm không hợp lệ" }, { status: 400 });
    }
    const result = gradeDienKhuyet(question, answerParsed.data);
    wrongNodeIds = [...result.wrongNodeIds];
    correct = result.correct;

    if (result.needsJudge.length > 0) {
      const allowed = await checkAndRecordJudgeCall(studentId, questionId);
      if (!allowed) {
        return NextResponse.json({ error: "Em đã hết lượt kiểm tra câu này hôm nay, mai quay lại nhé!" }, { status: 429 });
      }

      const judgeResults = await judgeDienKhuyet(question, result.needsJudge);
      const hints: string[] = [];
      for (const jr of judgeResults) {
        if (!jr.correct) {
          wrongNodeIds.push(jr.nodeId);
          if (jr.hint) hints.push(jr.hint);
        }
      }
      correct = result.wrongNodeIds.length === 0 && judgeResults.every(j => j.correct);
      if (!correct && hints.length > 0) {
        message = "Gợi ý: " + hints.join(" ");
      }
    }
  } else if (question.mode === "tu_do") {
    const answerParsed = tuDoAnswerSchema.safeParse(body.answer);
    if (!answerParsed.success) {
      return NextResponse.json({ error: "Dữ liệu sơ đồ không hợp lệ" }, { status: 400 });
    }

    // Step 1: Structural validation (no Gemini needed)
    // We create a dummy question object to reuse validateFlowchart
    const dummyQ = {
      ...question,
      nodes: answerParsed.data.nodes,
      edges: answerParsed.data.edges,
      mode: "tu_do" as const, // to skip sap_xep/dien_khuyet specific checks
      blanks: [],
      distractors: [],
    };
    
    const structErrors = validateFlowchart(dummyQ);
    if (structErrors.length > 0) {
      correct = false;
      message = "Sơ đồ chưa hợp lệ về cấu trúc:\n- " + structErrors.join("\n- ");
    } else {
      // Step 2: Gemini Judge
      const allowed = await checkAndRecordJudgeCall(studentId, questionId);
      if (!allowed) {
        return NextResponse.json({ error: "Em đã hết lượt kiểm tra câu này hôm nay, mai quay lại nhé!" }, { status: 429 });
      }

      const judgeResult = await judgeTuDo(question, answerParsed.data);
      correct = judgeResult.correct;
      message = judgeResult.correct ? "Chính xác! " + (judgeResult.reason ?? "") : judgeResult.reason;
      wrongNodeIds = judgeResult.errorNodeIds ?? [];
      wrongEdgeIds = judgeResult.errorEdgeIds ?? [];
    }
  }

  if (correct) {
    if (!existingAttempt) {
      // First time correct — award points
      pointsAwarded = POINTS[question.mode];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db.from("attempts") as any).upsert(
        {
          student_id: studentId,
          question_id: questionId,
          correct: true,
          points: pointsAwarded,
        },
        { onConflict: "student_id,question_id" }
      );
      message = message || `Giỏi quá! +${pointsAwarded} điểm 🎉`;
    } else {
      // Already completed
      message = message || "Đúng rồi! Em đã làm câu này trước đó rồi.";
      pointsAwarded = 0;
    }
  } else {
    message = message || "Gần đúng rồi, em thử lại nhé 💪";
  }

  // Get updated total points
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pointsData } = await (db.from("attempts") as any)
    .select("points")
    .eq("student_id", studentId);

  const totalPoints = (pointsData ?? []).reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, row: any) => sum + (row.points ?? 0),
    0
  );

  return NextResponse.json({
    correct,
    pointsAwarded,
    totalPoints,
    wrongNodeIds: correct ? undefined : wrongNodeIds,
    wrongEdgeIds: correct ? undefined : wrongEdgeIds,
    message,
    explanation: correct ? question.explanation : undefined,
    modelAnswer: {
      nodes: question.nodes,
      edges: question.edges,
    }
  });
}
