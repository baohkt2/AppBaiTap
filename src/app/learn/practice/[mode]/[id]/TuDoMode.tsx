"use client";

import { useState, useCallback, useRef } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  Handle,
  Position,
  ConnectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useStudent } from "@/app/learn/layout";

import FlowDiagram from "@/components/FlowDiagram";

// ===== Custom Nodes for Flowchart =====
// We use simple HTML/CSS to render the shapes so they scale and look like the FlowDiagram SVG.

const nodeStyleBase = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center" as const,
  fontSize: 12,
  fontWeight: "bold",
  padding: "4px 8px",
  background: "white",
  border: "2px solid #94a3b8",
};

const NodeHandles = () => (
  <>
    <Handle type="source" position={Position.Top} id="top" className="custom-handle" />
    <Handle type="source" position={Position.Right} id="right" className="custom-handle" />
    <Handle type="source" position={Position.Bottom} id="bottom" className="custom-handle" />
    <Handle type="source" position={Position.Left} id="left" className="custom-handle" />
  </>
);

function TerminatorNode({ data }: { data: { label?: string } }) {
  return (
    <div style={{ ...nodeStyleBase, borderRadius: 25, borderColor: "#7c3aed", background: "#ede9fe", color: "#5b21b6", width: 140, height: 50 }}>
      <NodeHandles />
      <div>{data.label || "Bắt đầu / Kết thúc"}</div>
    </div>
  );
}

function ProcessNode({ data }: { data: { label?: string } }) {
  return (
    <div style={{ ...nodeStyleBase, borderRadius: 8, borderColor: "#3b82f6", background: "#eff6ff", color: "#1e40af", width: 140, height: 50 }}>
      <NodeHandles />
      <div>{data.label || "Thao tác"}</div>
    </div>
  );
}

function DecisionNode({ data }: { data: { label?: string } }) {
  return (
    <div style={{ position: "relative", width: 140, height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        position: "absolute",
        width: "100px", height: "100px",
        background: "#fef3c7",
        border: "2px solid #f59e0b",
        transform: "rotate(45deg)",
      }}></div>
      <div style={{ zIndex: 1, fontSize: 12, fontWeight: "bold", color: "#92400e", textAlign: "center", padding: 10 }}>
        {data.label || "Điều kiện?"}
      </div>
      <NodeHandles />
    </div>
  );
}

const nodeTypes = {
  terminator: TerminatorNode,
  process: ProcessNode,
  decision: DecisionNode,
};

// ======================================

interface MaskedQuestion {
  id: string;
  scenario: string;
  structure: string;
  nodes?: Array<{ id: string; shape: string; text: string }>;
  edges?: Array<{ from: string; to: string; label?: string }>;
}

interface Props {
  question: MaskedQuestion;
  questionId: string;
}

interface SubmitResult {
  correct: boolean;
  pointsAwarded: number;
  totalPoints: number;
  message: string;
}

export default function TuDoMode({ question, questionId }: Props) {
  const { refreshStudent } = useStudent();

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  
  // History for Undo/Redo
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([{ nodes: [], edges: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Selection
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);

  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
  const [editVal, setEditVal] = useState("");

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const saveHistory = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ nodes: newNodes, edges: newEdges });
      return newHistory;
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setNodes(prev.nodes);
      setEdges(prev.edges);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setNodes(next.nodes);
      setEdges(next.edges);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const [failCount, setFailCount] = useState(0);
  const [showModelAnswer, setShowModelAnswer] = useState(false);

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      setNodes((nds) => {
        const newNodes = applyNodeChanges(changes, nds);
        if (changes.some(c => c.type === 'remove')) {
          setTimeout(() => saveHistory(newNodes, edges), 0);
        }
        return newNodes;
      });
    },
    [edges, saveHistory]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      setEdges((eds) => {
        const newEdges = applyEdgeChanges(changes, eds);
        if (changes.some(c => c.type === 'remove')) {
          setTimeout(() => saveHistory(nodes, newEdges), 0);
        }
        return newEdges;
      });
    },
    [nodes, saveHistory]
  );

  const onConnect = useCallback((connection: Connection) => {
    const sourceNode = nodes.find(n => n.id === connection.source);
    const newEdgeId = `edge_${Date.now()}`;
    const newEdge: Edge = { ...connection, id: newEdgeId, animated: true, label: undefined };
    
    setEdges((eds) => {
      const newEdges = addEdge(newEdge, eds);
      setTimeout(() => saveHistory(nodes, newEdges), 0);
      return newEdges;
    });

    // Automatically prompt for label if it's from a decision node
    if (sourceNode?.type === "decision") {
      setEditingEdge(newEdge);
      setEditVal("");
    }
  }, [nodes, saveHistory]);

  const addNode = (type: "terminator" | "process" | "decision", defaultLabel: string) => {
    if (nodes.length >= 12) {
      alert("Chỉ được tạo tối đa 12 nút");
      return;
    }
    const id = `node_${Date.now()}`;
    const newNode: Node = {
      id,
      type,
      position: { x: 100, y: 100 + nodes.length * 60 },
      data: { label: defaultLabel },
    };
    const newNodes = [...nodes, newNode];
    setNodes(newNodes);
    saveHistory(newNodes, edges);
  };

  const handleNodeDoubleClick = (_: React.MouseEvent, node: Node) => {
    setEditingNode(node);
    setEditVal(node.data.label as string);
  };

  const handleEdgeDoubleClick = (_: React.MouseEvent, edge: Edge) => {
    setEditingEdge(edge);
    setEditVal(edge.label as string ?? "");
  };

  const editSelected = () => {
    if (selectedNodeIds.length === 1) {
      const node = nodes.find(n => n.id === selectedNodeIds[0]);
      if (node) {
        setEditingNode(node);
        setEditVal(node.data.label as string);
      }
    } else if (selectedEdgeIds.length === 1) {
      const edge = edges.find(e => e.id === selectedEdgeIds[0]);
      if (edge) {
        setEditingEdge(edge);
        setEditVal(edge.label as string ?? "");
      }
    }
  };

  const deleteSelected = () => {
    const newNodes = nodes.filter(n => !selectedNodeIds.includes(n.id));
    const newEdges = edges.filter(e => !selectedEdgeIds.includes(e.id) && !selectedNodeIds.includes(e.source) && !selectedNodeIds.includes(e.target));
    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
    saveHistory(newNodes, newEdges);
  };

  const saveEdit = () => {
    if (editingNode) {
      const newNodes = nodes.map(n => n.id === editingNode.id ? { ...n, data: { ...n.data, label: editVal.substring(0, 60) } } : n);
      setNodes(newNodes);
      setEditingNode(null);
      saveHistory(newNodes, edges);
    } else if (editingEdge) {
      const newEdges = edges.map(e => e.id === editingEdge.id ? { ...e, label: editVal.trim() === "" ? undefined : editVal } : e);
      setEdges(newEdges);
      setEditingEdge(null);
      saveHistory(nodes, newEdges);
    }
  };

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setResult(null);

    const answer = {
      nodes: nodes.map(n => ({
        id: n.id,
        shape: n.type,
        text: (n.data.label as string) || "Chưa nhập",
      })),
      edges: edges.map(e => ({
        from: e.source,
        to: e.target,
        label: e.label as string | undefined,
      })),
    };

    try {
      const res = await fetch(`/api/questions/${questionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      const data = await res.json();
      setResult(data);

      if (data.correct) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        refreshStudent();
      } else {
        setFailCount(c => c + 1);
      }
    } catch {
      setResult({
        correct: false,
        pointsAwarded: 0,
        totalPoints: 0,
        message: "Lỗi kết nối, thử lại nhé",
      });
      setFailCount(c => c + 1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <style>{`
        .custom-handle {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background-color: #3b82f6;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .react-flow__node:hover .custom-handle,
        .react-flow__node.selected .custom-handle {
          opacity: 1;
        }
        /* Hit area extension */
        .custom-handle::after {
          content: "";
          position: absolute;
          top: -10px;
          left: -10px;
          right: -10px;
          bottom: -10px;
          background: transparent;
        }
      `}</style>
      <div className="card p-3 flex flex-wrap gap-2 justify-center bg-gray-50">
        <button onClick={() => addNode("terminator", "Bắt đầu")} className="btn btn-outline btn-sm bg-white" style={{ borderColor: "#7c3aed", color: "#5b21b6" }}>
          + Oval (Bắt đầu)
        </button>
        <button onClick={() => addNode("terminator", "Kết thúc")} className="btn btn-outline btn-sm bg-white" style={{ borderColor: "#7c3aed", color: "#5b21b6" }}>
          + Oval (Kết thúc)
        </button>
        <button onClick={() => addNode("process", "Thao tác")} className="btn btn-outline btn-sm bg-white" style={{ borderColor: "#3b82f6", color: "#1e40af" }}>
          + Chữ nhật (Thao tác)
        </button>
        <button onClick={() => addNode("decision", "Điều kiện?")} className="btn btn-outline btn-sm bg-white" style={{ borderColor: "#f59e0b", color: "#92400e" }}>
          + Hình thoi (Điều kiện)
        </button>
        <div className="w-full border-t border-gray-200 my-1"></div>
        <button onClick={undo} disabled={historyIndex === 0} className="btn btn-ghost btn-sm">
          ↩️ Hoàn tác
        </button>
        <button onClick={redo} disabled={historyIndex === history.length - 1} className="btn btn-ghost btn-sm">
          ↪️ Làm lại
        </button>
        <button 
          onClick={editSelected} 
          disabled={selectedNodeIds.length + selectedEdgeIds.length !== 1} 
          className="btn btn-outline btn-sm"
        >
          ✏️ Sửa mục đang chọn
        </button>
        <button 
          onClick={deleteSelected} 
          disabled={!selectedNodeIds.length && !selectedEdgeIds.length} 
          className="btn btn-outline btn-sm text-red-600 border-red-200"
        >
          🗑 Xóa mục đang chọn
        </button>
        <div className="w-full text-center text-xs text-gray-500 mt-1">
          💡 Chọn khối/mũi tên rồi bấm Sửa hoặc Xóa. Chạm khối để hiện mũi tên, kéo để nối.
        </div>
      </div>

      <div className="card" style={{ height: 500 }} ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={handleNodeDoubleClick}
          onEdgeDoubleClick={handleEdgeDoubleClick}
          onSelectionChange={({ nodes: selNodes, edges: selEdges }) => {
            setSelectedNodeIds(selNodes.map(n => n.id));
            setSelectedEdgeIds(selEdges.map(e => e.id));
          }}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          connectionRadius={40}
          fitView
          attributionPosition="bottom-right"
        >
          <Background color="#ccc" gap={16} />
          <Controls />
        </ReactFlow>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {(editingNode || editingEdge) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          >
            <div className="card p-5 w-full max-w-sm">
              <h3 className="font-bold mb-3">Nhập nội dung {editingNode ? "khối" : "mũi tên"}</h3>
              {editingEdge && (
                <div className="text-xs text-gray-500 mb-2">Gợi ý: Điền nhãn cho điều kiện (VD: Đúng/Sai, Có/Không, Đã ăn/Chưa ăn...)</div>
              )}
              <input
                type="text"
                autoFocus
                className="input-field w-full mb-3"
                value={editVal}
                onChange={e => setEditVal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveEdit()}
              />
              <div className="flex gap-2">
                <button onClick={saveEdit} className="btn btn-primary flex-1">Lưu</button>
                <button onClick={() => { setEditingNode(null); setEditingEdge(null); }} className="btn btn-ghost flex-1">Hủy</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="card p-4"
            style={{
              borderLeft: `4px solid ${result.correct ? "var(--color-success)" : "var(--color-error)"}`,
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{result.correct ? "🎉" : "💪"}</span>
              <div>
                <p className="font-bold text-sm whitespace-pre-line">{result.message}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting || result?.correct}
          className="btn btn-primary flex-1"
        >
          {submitting ? "Đang kiểm tra..." : result?.correct ? "✓ Đã hoàn thành" : "Nộp bài 🚀"}
        </button>
        
        {(result?.correct || failCount >= 3) && (
          <button 
            onClick={() => setShowModelAnswer(true)} 
            className="btn btn-outline"
          >
            💡 Xem đáp án mẫu
          </button>
        )}
      </div>

      <AnimatePresence>
        {showModelAnswer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          >
            <div className="card p-5 w-full max-w-2xl max-h-[90vh] flex flex-col">
              <h3 className="font-bold mb-3 text-lg">Đáp án mẫu</h3>
              <div className="flex-1 overflow-auto bg-gray-50 rounded-lg p-2">
                <FlowDiagram
                  nodes={question.nodes ?? []}
                  edges={question.edges ?? []}
                />
              </div>
              <button 
                onClick={() => setShowModelAnswer(false)} 
                className="btn btn-primary w-full mt-4"
              >
                Đóng
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
