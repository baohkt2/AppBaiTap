import type { Question, FlowNode, FlowEdge } from "../schema";
import { DECISION_LABELS } from "./conventions";

/**
 * Validate a flowchart question against all rules from plan section 8 & 9.1.
 * Returns an array of error messages in Vietnamese. Empty = valid.
 */
export function validateFlowchart(q: Question): string[] {
  const errors: string[] = [];
  const { nodes, edges, mode, structure, blanks, distractors } = q;

  // --- Basic checks ---
  if (nodes.length > 9) {
    errors.push("Tổng số nút không được vượt quá 9");
  }

  // Check unique node IDs
  const nodeIds = new Set<string>();
  for (const n of nodes) {
    if (nodeIds.has(n.id)) {
      errors.push(`ID nút "${n.id}" bị trùng`);
    }
    nodeIds.add(n.id);
  }

  // Check node text
  for (const n of nodes) {
    if (!n.text || n.text.trim().length === 0) {
      errors.push(`Nút "${n.id}" không có nội dung`);
    }
    if (n.text.length > 40) {
      errors.push(`Nút "${n.id}" có nội dung quá 40 ký tự`);
    }
  }

  // --- Terminator checks ---
  const terminators = nodes.filter((n) => n.shape === "terminator");
  const startNodes = terminators.filter(
    (n) => n.text.toLowerCase().includes("bắt đầu") || n.text.toLowerCase() === "bat dau"
  );
  const endNodes = terminators.filter(
    (n) => n.text.toLowerCase().includes("kết thúc") || n.text.toLowerCase() === "ket thuc"
  );

  if (startNodes.length !== 1) {
    errors.push(`Phải có đúng 1 nút "Bắt đầu" (tìm thấy ${startNodes.length})`);
  }
  if (endNodes.length !== 1) {
    errors.push(`Phải có đúng 1 nút "Kết thúc" (tìm thấy ${endNodes.length})`);
  }

  // --- Edge checks ---
  for (const e of edges) {
    if (!nodeIds.has(e.from)) {
      errors.push(`Cạnh từ "${e.from}" trỏ tới nút không tồn tại`);
    }
    if (!nodeIds.has(e.to)) {
      errors.push(`Cạnh tới "${e.to}" trỏ tới nút không tồn tại`);
    }
  }

  // Build adjacency for each node
  const nodeMap = new Map<string, FlowNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const outEdges = new Map<string, FlowEdge[]>();
  const inEdges = new Map<string, FlowEdge[]>();
  for (const id of nodeIds) {
    outEdges.set(id, []);
    inEdges.set(id, []);
  }
  for (const e of edges) {
    outEdges.get(e.from)?.push(e);
    inEdges.get(e.to)?.push(e);
  }

  // Start node: no edges in, exactly 1 edge out
  if (startNodes.length === 1) {
    const startId = startNodes[0].id;
    const startIn = inEdges.get(startId) ?? [];
    const startOut = outEdges.get(startId) ?? [];
    if (startIn.length > 0) {
      errors.push("Nút \"Bắt đầu\" không được có mũi tên vào");
    }
    if (startOut.length !== 1) {
      errors.push("Nút \"Bắt đầu\" phải có đúng 1 mũi tên ra");
    }
  }

  // End node: no edges out
  if (endNodes.length === 1) {
    const endId = endNodes[0].id;
    const endOut = outEdges.get(endId) ?? [];
    if (endOut.length > 0) {
      errors.push("Nút \"Kết thúc\" không được có mũi tên ra");
    }
  }

  // Process nodes: exactly 1 edge out, at least 1 edge in
  const processNodes = nodes.filter((n) => n.shape === "process");
  for (const n of processNodes) {
    const out = outEdges.get(n.id) ?? [];
    const inE = inEdges.get(n.id) ?? [];
    if (out.length !== 1) {
      errors.push(`Nút "${n.text}" (hình chữ nhật) phải có đúng 1 mũi tên ra (có ${out.length})`);
    }
    if (inE.length < 1) {
      errors.push(`Nút "${n.text}" (hình chữ nhật) phải có ít nhất 1 mũi tên vào`);
    }
  }

  // Decision nodes: exactly 2 edges out with labels Đúng and Sai
  const decisionNodes = nodes.filter((n) => n.shape === "decision");
  for (const n of decisionNodes) {
    const out = outEdges.get(n.id) ?? [];
    if (out.length !== 2) {
      errors.push(
        `Hình thoi "${n.text}" phải có đúng 2 mũi tên ra (có ${out.length})`
      );
    } else {
      const label1 = (out[0].label || "").trim();
      const label2 = (out[1].label || "").trim();

      if (!label1 || !label2) {
        errors.push(`Hình thoi "${n.text}" phải có 2 mũi tên ra có điền đầy đủ nhãn điều kiện (VD: "Có", "Không")`);
      } else if (label1.toLowerCase() === label2.toLowerCase()) {
        errors.push(`Hình thoi "${n.text}" phải có 2 mũi tên ra với nhãn khác nhau (hiện tại cả 2 đều là "${label1}")`);
      }
    }
    const inE = inEdges.get(n.id) ?? [];
    if (inE.length < 1) {
      errors.push(`Hình thoi "${n.text}" phải có ít nhất 1 mũi tên vào`);
    }
  }

  // --- Structure checks ---
  if (structure === "tuan_tu") {
    if (decisionNodes.length !== 0) {
      errors.push("Cấu trúc tuần tự không được có hình thoi (decision)");
    }
  }

  if (structure === "re_nhanh") {
    if (decisionNodes.length !== 1) {
      errors.push(
        `Cấu trúc rẽ nhánh phải có đúng 1 hình thoi (có ${decisionNodes.length})`
      );
    }
    // No cycles allowed for re_nhanh
    if (hasCycle(nodes, edges)) {
      errors.push("Cấu trúc rẽ nhánh không được có vòng lặp");
    }
  }

  if (structure === "lap") {
    if (decisionNodes.length !== 1) {
      errors.push(
        `Cấu trúc lặp phải có đúng 1 hình thoi (có ${decisionNodes.length})`
      );
    }
    // Must have exactly one back edge (cycle)
    if (!hasCycle(nodes, edges)) {
      errors.push("Cấu trúc lặp phải có ít nhất một mũi tên quay ngược (vòng lặp)");
    }
  }

  // --- Reachability checks ---
  if (startNodes.length === 1 && endNodes.length === 1) {
    const startId = startNodes[0].id;
    const endId = endNodes[0].id;

    // All nodes reachable from Start
    const reachableFromStart = bfs(startId, outEdges);
    for (const n of nodes) {
      if (!reachableFromStart.has(n.id)) {
        errors.push(`Nút "${n.text}" không tới được từ "Bắt đầu"`);
      }
    }

    // All nodes can reach End (reverse BFS)
    const reverseAdj = new Map<string, string[]>();
    for (const id of nodeIds) reverseAdj.set(id, []);
    for (const e of edges) {
      reverseAdj.get(e.to)?.push(e.from);
    }
    const canReachEnd = new Set<string>();
    const queue2 = [endId];
    canReachEnd.add(endId);
    while (queue2.length > 0) {
      const curr = queue2.shift()!;
      for (const prev of reverseAdj.get(curr) ?? []) {
        if (!canReachEnd.has(prev)) {
          canReachEnd.add(prev);
          queue2.push(prev);
        }
      }
    }
    for (const n of nodes) {
      if (!canReachEnd.has(n.id)) {
        errors.push(`Nút "${n.text}" không đi tới được "Kết thúc"`);
      }
    }
  }

  // --- Mode-specific checks ---
  // Check blanks reference valid non-terminator nodes
  for (const blankId of blanks) {
    if (!nodeIds.has(blankId)) {
      errors.push(`Blank "${blankId}" không tồn tại trong danh sách nút`);
    } else {
      const blankNode = nodeMap.get(blankId)!;
      if (blankNode.shape === "terminator") {
        errors.push(`Blank "${blankId}" không được là nút terminator`);
      }
    }
  }

  if (mode === "sap_xep") {
    // blanks = all process + decision nodes
    const nonTerminatorIds = nodes
      .filter((n) => n.shape !== "terminator")
      .map((n) => n.id)
      .sort();
    const sortedBlanks = [...blanks].sort();
    if (
      sortedBlanks.length !== nonTerminatorIds.length ||
      !sortedBlanks.every((b, i) => b === nonTerminatorIds[i])
    ) {
      errors.push(
        "Chế độ sắp xếp: blanks phải bao gồm TẤT CẢ nút process và decision"
      );
    }
    // distractors 1-2
    if (distractors.length < 1 || distractors.length > 2) {
      errors.push("Chế độ sắp xếp: phải có 1-2 thẻ nhiễu (distractors)");
    }
    // No duplicate text among all texts + distractors
    const allTexts = nodes
      .filter((n) => blanks.includes(n.id))
      .map((n) => n.text.toLowerCase().trim());
    const distTexts = distractors.map((d) => d.toLowerCase().trim());
    const combined = [...allTexts, ...distTexts];
    const uniqueTexts = new Set(combined);
    if (uniqueTexts.size !== combined.length) {
      errors.push("Chế độ sắp xếp: nội dung các thẻ (kể cả nhiễu) không được trùng nhau");
    }
  }

  if (mode === "dien_khuyet") {
    if (blanks.length < 2 || blanks.length > 4) {
      errors.push("Chế độ điền khuyết: phải có 2-4 ô trống");
    }
    // Each blank node must have accepted with 2-4 entries
    for (const blankId of blanks) {
      const blankNode = nodeMap.get(blankId);
      if (blankNode) {
        const accepted = blankNode.accepted ?? [];
        if (accepted.length < 2 || accepted.length > 4) {
          errors.push(
            `Nút "${blankId}": accepted phải có 2-4 đáp án (có ${accepted.length})`
          );
        }
      }
    }
  }

  if (mode === "tu_do") {
    if (blanks.length !== 0) {
      errors.push("Chế độ tự do: blanks phải rỗng");
    }
    if (distractors.length !== 0) {
      errors.push("Chế độ tự do: distractors phải rỗng");
    }
  }

  return errors;
}

/** BFS from a start node, returns set of reachable node IDs */
function bfs(
  startId: string,
  adjList: Map<string, FlowEdge[]>
): Set<string> {
  const visited = new Set<string>();
  const queue = [startId];
  visited.add(startId);
  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const edge of adjList.get(curr) ?? []) {
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        queue.push(edge.to);
      }
    }
  }
  return visited;
}

/** Detect if the graph has a cycle using DFS */
function hasCycle(nodes: FlowNode[], edges: FlowEdge[]): boolean {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    adj.get(e.from)?.push(e.to);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const n of nodes) color.set(n.id, WHITE);

  function dfs(nodeId: string): boolean {
    color.set(nodeId, GRAY);
    for (const neighbor of adj.get(nodeId) ?? []) {
      if (color.get(neighbor) === GRAY) return true; // back edge = cycle
      if (color.get(neighbor) === WHITE && dfs(neighbor)) return true;
    }
    color.set(nodeId, BLACK);
    return false;
  }

  for (const n of nodes) {
    if (color.get(n.id) === WHITE && dfs(n.id)) return true;
  }
  return false;
}
