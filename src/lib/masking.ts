import type { Question, FlowEdge } from "./schema";

/**
 * Mask a question for client consumption, removing answer data.
 * Per plan section 9.2.
 */
export function maskQuestion(question: Question): {
  id: string;
  lesson: number;
  mode: string;
  structure: string;
  title: string;
  scenario: string;
  nodes?: Array<{ id: string; shape: string; text: string }>;
  edges?: FlowEdge[];
  blanks?: string[];
  cards?: Array<{ cardId: string; text: string }>;
  explanation?: undefined; // never sent until correct
} {
  const { id, lesson, mode, structure, title, scenario, nodes, edges, blanks, distractors } =
    question;

  if (mode === "tu_do") {
    // Only return title, scenario, structure — no nodes/edges
    return { id, lesson, mode, structure, title, scenario };
  }

  if (mode === "sap_xep") {
    // Remove text from blank nodes; return shuffled cards
    const maskedNodes = nodes.map((n) => ({
      id: n.id,
      shape: n.shape,
      text: blanks.includes(n.id) ? "" : n.text,
    }));

    // Build card list: correct texts + distractors, shuffled
    const correctTexts = nodes
      .filter((n) => blanks.includes(n.id))
      .map((n) => n.text);
    const allCardTexts = [...correctTexts, ...distractors];

    // Shuffle with random IDs
    const cards = allCardTexts
      .map((text) => ({
        cardId: `card-${Math.random().toString(36).slice(2, 10)}`,
        text,
      }))
      .sort(() => Math.random() - 0.5);

    return {
      id,
      lesson,
      mode,
      structure,
      title,
      scenario,
      nodes: maskedNodes,
      edges,
      blanks,
      cards,
    };
  }

  if (mode === "dien_khuyet") {
    // Remove text and accepted from blank nodes
    const maskedNodes = nodes.map((n) => ({
      id: n.id,
      shape: n.shape,
      text: blanks.includes(n.id) ? "" : n.text,
      // Never include 'accepted' in response
    }));

    return {
      id,
      lesson,
      mode,
      structure,
      title,
      scenario,
      nodes: maskedNodes,
      edges,
      blanks,
    };
  }

  // Fallback (shouldn't happen)
  return { id, lesson, mode, structure, title, scenario };
}

/**
 * Check that masked output doesn't leak answer data.
 * Used in tests.
 */
export function verifyNoLeaks(
  original: Question,
  masked: ReturnType<typeof maskQuestion>
): string[] {
  const leaks: string[] = [];
  const json = JSON.stringify(masked);

  if (original.mode === "tu_do") {
    // Should not contain any node texts or edges
    for (const n of original.nodes) {
      if (n.shape !== "terminator" && json.includes(`"text":"${n.text}"`)) {
        leaks.push(`Leaked node text: "${n.text}"`);
      }
    }
    if (json.includes('"edges"')) {
      leaks.push("Leaked edges in tu_do mode");
    }
  }

  if (original.mode === "sap_xep" || original.mode === "dien_khuyet") {
    for (const blankId of original.blanks) {
      const node = original.nodes.find((n) => n.id === blankId);
      if (node?.accepted) {
        for (const a of node.accepted) {
          if (json.includes(`"accepted"`) && json.includes(a)) {
            leaks.push(`Leaked accepted answer: "${a}" for node ${blankId}`);
          }
        }
      }
    }
  }

  if (json.includes('"explanation"')) {
    leaks.push("Leaked explanation");
  }

  return leaks;
}
