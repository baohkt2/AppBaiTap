"use client";

import { useMemo } from "react";
import dagre from "@dagrejs/dagre";

interface FlowNode {
  id: string;
  shape: string;
  text: string;
}

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}

interface FlowDiagramProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  blanks?: string[];
  wrongNodeIds?: string[];
  /** Render custom content inside blank nodes (e.g. inputs, drop zones) */
  renderBlank?: (nodeId: string, x: number, y: number, w: number, h: number) => React.ReactNode;
  width?: number;
}

// Layout constants
const NODE_W = 140;
const NODE_H = 50;
const DECISION_SIZE = 70; // half-diagonal
const PADDING = 40;

// Colors
const COLORS = {
  terminator: { fill: "#ede9fe", stroke: "#7c3aed", text: "#5b21b6" },
  process: { fill: "#eff6ff", stroke: "#3b82f6", text: "#1e40af" },
  decision: { fill: "#fef3c7", stroke: "#f59e0b", text: "#92400e" },
  blank: { fill: "#f8fafc", stroke: "#94a3b8", text: "#64748b" },
  wrong: { fill: "#fef2f2", stroke: "#ef4444", text: "#dc2626" },
};

const EDGE_COLORS = {
  edge: "#64748b",
  edgeLabel: "#7c3aed",
  arrow: "#64748b",
};

interface LayoutNode {
  id: string;
  shape: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isBlank: boolean;
  isWrong: boolean;
}

interface LayoutEdge {
  from: string;
  to: string;
  label?: string;
  points: { x: number; y: number }[];
  isBackEdge: boolean;
}

function layoutGraph(
  nodes: FlowNode[],
  edges: FlowEdge[],
  blanks: string[],
  wrongNodeIds: string[]
): { layoutNodes: LayoutNode[]; layoutEdges: LayoutEdge[]; width: number; height: number } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 50, marginx: PADDING, marginy: PADDING });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) {
    const w = n.shape === "decision" ? DECISION_SIZE * 2 : NODE_W;
    const h = n.shape === "decision" ? DECISION_SIZE * 2 : NODE_H;
    g.setNode(n.id, { width: w, height: h });
  }

  // Detect back edges for loop structure
  const nodeOrder = new Map<string, number>();
  nodes.forEach((n, i) => nodeOrder.set(n.id, i));

  for (const e of edges) {
    const fromIdx = nodeOrder.get(e.from) ?? 0;
    const toIdx = nodeOrder.get(e.to) ?? 0;
    const isBackEdge = toIdx < fromIdx;

    if (!isBackEdge) {
      g.setEdge(e.from, e.to);
    }
  }

  dagre.layout(g);

  const blanksSet = new Set(blanks);
  const wrongSet = new Set(wrongNodeIds);

  const layoutNodes: LayoutNode[] = nodes.map((n) => {
    const pos = g.node(n.id);
    const w = n.shape === "decision" ? DECISION_SIZE * 2 : NODE_W;
    const h = n.shape === "decision" ? DECISION_SIZE * 2 : NODE_H;
    return {
      id: n.id,
      shape: n.shape,
      text: n.text,
      x: pos.x,
      y: pos.y,
      w,
      h,
      isBlank: blanksSet.has(n.id),
      isWrong: wrongSet.has(n.id),
    };
  });

  const nodePositions = new Map(layoutNodes.map((n) => [n.id, n]));

  const layoutEdges: LayoutEdge[] = edges.map((e) => {
    const fromNode = nodePositions.get(e.from)!;
    const toNode = nodePositions.get(e.to)!;
    const fromIdx = nodeOrder.get(e.from) ?? 0;
    const toIdx = nodeOrder.get(e.to) ?? 0;
    const isBackEdge = toIdx < fromIdx;

    let points: { x: number; y: number }[];

    if (isBackEdge) {
      // Back edge: route around the right side
      const rightX = Math.max(fromNode.x + fromNode.w / 2, toNode.x + toNode.w / 2) + 50;
      points = [
        { x: fromNode.x + fromNode.w / 2, y: fromNode.y },
        { x: rightX, y: fromNode.y },
        { x: rightX, y: toNode.y },
        { x: toNode.x + toNode.w / 2, y: toNode.y },
      ];
    } else {
      // Normal edge: from bottom of source to top of target
      points = [
        { x: fromNode.x, y: fromNode.y + fromNode.h / 2 },
        { x: toNode.x, y: toNode.y - toNode.h / 2 },
      ];

      // If decision, offset the exit points left/right
      if (fromNode.shape === "decision") {
        if (e.label === "Đúng") {
          points[0] = { x: fromNode.x - fromNode.w / 2, y: fromNode.y };
        } else if (e.label === "Sai") {
          points[0] = { x: fromNode.x + fromNode.w / 2, y: fromNode.y };
        }
        // Add a bend point
        points.splice(1, 0, { x: points[0].x, y: (points[0].y + points[points.length - 1].y) / 2 });
      }
    }

    return { from: e.from, to: e.to, label: e.label, points, isBackEdge };
  });

  const allX = layoutNodes.flatMap((n) => [n.x - n.w / 2, n.x + n.w / 2]);
  const allY = layoutNodes.flatMap((n) => [n.y - n.h / 2, n.y + n.h / 2]);
  // Include back edge routing points
  for (const e of layoutEdges) {
    for (const p of e.points) {
      allX.push(p.x);
      allY.push(p.y);
    }
  }

  const width = Math.max(...allX) + PADDING;
  const height = Math.max(...allY) + PADDING;

  return { layoutNodes, layoutEdges, width, height };
}

export default function FlowDiagram({
  nodes,
  edges,
  blanks = [],
  wrongNodeIds = [],
  renderBlank,
  width: containerWidth,
}: FlowDiagramProps) {
  const { layoutNodes, layoutEdges, width, height } = useMemo(
    () => layoutGraph(nodes, edges, blanks, wrongNodeIds),
    [nodes, edges, blanks, wrongNodeIds]
  );

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={containerWidth ?? width}
        height={height}
        style={{ maxWidth: "100%", height: "auto", display: "block" }}
        className="mx-auto"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={EDGE_COLORS.arrow} />
          </marker>
        </defs>

        {/* Edges */}
        {layoutEdges.map((edge, i) => {
          const pathD = edge.points.length === 2
            ? `M${edge.points[0].x},${edge.points[0].y} L${edge.points[1].x},${edge.points[1].y}`
            : `M${edge.points.map((p) => `${p.x},${p.y}`).join(" L")}`;

          const midIdx = Math.floor(edge.points.length / 2);
          const labelX = (edge.points[midIdx - 1].x + edge.points[midIdx].x) / 2;
          const labelY = (edge.points[midIdx - 1].y + edge.points[midIdx].y) / 2;

          return (
            <g key={`edge-${i}`}>
              <path
                d={pathD}
                fill="none"
                stroke={EDGE_COLORS.edge}
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
                strokeDasharray={edge.isBackEdge ? "6,4" : undefined}
              />
              {edge.label && (
                <>
                  <rect
                    x={labelX - 18}
                    y={labelY - 10}
                    width="36"
                    height="20"
                    rx="4"
                    fill="white"
                    stroke="none"
                  />
                  <text
                    x={labelX}
                    y={labelY + 4}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                    fill={EDGE_COLORS.edgeLabel}
                  >
                    {edge.label}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {layoutNodes.map((node) => {
          const shapeKey = node.shape as keyof typeof COLORS;
          const colors = node.isWrong
            ? COLORS.wrong
            : node.isBlank && !node.text
              ? COLORS.blank
              : (shapeKey in COLORS ? COLORS[shapeKey] : COLORS.process);

          const strokeStyle = node.isBlank && !node.text
            ? { strokeDasharray: "6,4" }
            : {};

          return (
            <g key={node.id}>
              {/* Shape */}
              {node.shape === "terminator" && (
                <rect
                  x={node.x - node.w / 2}
                  y={node.y - node.h / 2}
                  width={node.w}
                  height={node.h}
                  rx={node.h / 2}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth="2"
                  {...strokeStyle}
                />
              )}
              {node.shape === "process" && (
                <rect
                  x={node.x - node.w / 2}
                  y={node.y - node.h / 2}
                  width={node.w}
                  height={node.h}
                  rx="8"
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth="2"
                  {...strokeStyle}
                />
              )}
              {node.shape === "decision" && (
                <polygon
                  points={`${node.x},${node.y - DECISION_SIZE} ${node.x + DECISION_SIZE},${node.y} ${node.x},${node.y + DECISION_SIZE} ${node.x - DECISION_SIZE},${node.y}`}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth="2"
                  {...strokeStyle}
                />
              )}

              {/* Text */}
              {!(node.isBlank && renderBlank) && (
                node.text ? (
                  <text
                    x={node.x}
                    y={node.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="12"
                    fontWeight={node.shape === "terminator" ? "700" : "600"}
                    fill={colors.text}
                    style={{ pointerEvents: "none" }}
                  >
                    {node.text.length > 20
                      ? node.text.slice(0, 18) + "…"
                      : node.text}
                  </text>
                ) : node.isBlank ? (
                  <text
                    x={node.x}
                    y={node.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="11"
                    fill={COLORS.blank.text}
                    fontStyle="italic"
                  >
                    ?
                  </text>
                ) : null
              )}

              {/* Custom blank content overlay */}
              {renderBlank && node.isBlank && (
                <foreignObject
                  x={node.x - node.w / 2 + 4}
                  y={node.y - node.h / 2 + 4}
                  width={node.w - 8}
                  height={node.h - 8}
                >
                  {renderBlank(node.id, node.x, node.y, node.w, node.h)}
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
