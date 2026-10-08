import "server-only";
import { supabaseAdmin } from "./supabase";
import { callGemini } from "./gemini";
import { buildJudgeDienKhuyetPrompt, buildJudgeTuDoPrompt } from "./prompts";
import { Question } from "./schema";

/**
 * Check if the student can use Gemini judge, and record the call.
 * Returns true if allowed, false if limit exceeded.
 */
export async function checkAndRecordJudgeCall(studentId: string, questionId: string): Promise<boolean> {
  const db = supabaseAdmin();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStr = todayStart.toISOString();

  // Check total calls today
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: totalCount } = await (db.from("judge_calls") as any)
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentId)
    .gte("created_at", todayStr);

  if (totalCount !== null && totalCount >= 30) {
    return false;
  }

  // Check calls for this question today
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: questionCount } = await (db.from("judge_calls") as any)
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("question_id", questionId)
    .gte("created_at", todayStr);

  if (questionCount !== null && questionCount >= 3) {
    return false;
  }

  // Record the call
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.from("judge_calls") as any).insert({
    student_id: studentId,
    question_id: questionId,
  });

  return true;
}

export async function judgeDienKhuyet(
  question: Question,
  needsJudge: { nodeId: string; studentText: string; accepted: string[] }[]
): Promise<{ nodeId: string; correct: boolean; hint?: string }[]> {
  const promises = needsJudge.map(async (item) => {
    // Determine the context by finding edges connected to this node
    const node = question.nodes.find(n => n.id === item.nodeId);
    if (!node) return { nodeId: item.nodeId, correct: false };
    
    // Simplistic context extraction
    const prevEdges = question.edges.filter(e => e.to === item.nodeId);
    const prevNodes = prevEdges.map(e => question.nodes.find(n => n.id === e.from)?.text).filter(Boolean);
    const nextEdges = question.edges.filter(e => e.from === item.nodeId);
    const nextNodes = nextEdges.map(e => question.nodes.find(n => n.id === e.to)?.text).filter(Boolean);
    
    let context = `Nút hình ${node.shape === 'decision' ? 'thoi' : 'chữ nhật'}.`;
    if (prevNodes.length > 0) context += ` Đứng sau: [${prevNodes.join(", ")}].`;
    if (nextNodes.length > 0) context += ` Đứng trước: [${nextNodes.join(", ")}].`;

    const { system, user } = buildJudgeDienKhuyetPrompt(
      question.scenario,
      context,
      item.accepted,
      item.studentText
    );

    try {
      const response = await callGemini<{ correct: boolean; hint?: string }>({
        systemPrompt: system,
        userPrompt: user,
        responseSchema: {
          type: "object",
          properties: {
            correct: { type: "boolean" },
            hint: { type: "string" }
          },
          required: ["correct"]
        }
      });
      return { nodeId: item.nodeId, correct: response.correct, hint: response.hint };
    } catch (e) {
      console.error("DienKhuyet judge error:", e);
      // Fallback to false if Gemini fails
      return { nodeId: item.nodeId, correct: false };
    }
  });

  const results = await Promise.all(promises);
  return results.filter(r => r !== null);
}

export async function judgeTuDo(
  question: Question,
  studentDiagram: { nodes: Record<string, any>[]; edges: Record<string, any>[] }
): Promise<{ correct: boolean; reason: string; errorNodeIds?: string[]; errorEdgeIds?: string[] }> {
  const refDiagramStr = JSON.stringify({
    nodes: question.nodes.map(n => ({ shape: n.shape, text: n.text })),
    edges: question.edges.map(e => {
      const from = question.nodes.find(n => n.id === e.from)?.text;
      const to = question.nodes.find(n => n.id === e.to)?.text;
      return { from, to, label: e.label };
    })
  }, null, 2);

  const studentDiagramStr = JSON.stringify({
    nodes: studentDiagram.nodes.map(n => ({ id: n.id, shape: n.shape, text: n.text })),
    edges: studentDiagram.edges.map(e => {
      const from = studentDiagram.nodes.find(n => n.id === e.from)?.text;
      const to = studentDiagram.nodes.find(n => n.id === e.to)?.text;
      return { id: e.id, fromId: e.from, toId: e.to, from, to, label: e.label };
    })
  }, null, 2);

  const { system, user } = buildJudgeTuDoPrompt(
    question.scenario,
    question.structure,
    refDiagramStr,
    studentDiagramStr
  );

  try {
    return await callGemini<{ correct: boolean; reason: string; errorNodeIds?: string[]; errorEdgeIds?: string[] }>({
      systemPrompt: system,
      userPrompt: user,
      responseSchema: {
        type: "object",
        properties: {
          correct: { type: "boolean" },
          reason: { type: "string" },
          errorNodeIds: { type: "array", items: { type: "string" } },
          errorEdgeIds: { type: "array", items: { type: "string" } }
        },
        required: ["correct", "reason"]
      }
    });
  } catch (e) {
    console.error("TuDo judge error:", e);
    return { correct: false, reason: "Lỗi hệ thống chấm điểm, thử lại sau nhé.", errorNodeIds: [], errorEdgeIds: [] };
  }
}
