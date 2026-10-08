"use client";

import { useState, useCallback, useRef, createContext, useContext } from "react";
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
  Panel,
  MarkerType,
  NodeToolbar,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useStudent } from "@/app/learn/layout";
import dagre from "dagre";
import { Pencil, Trash2, Settings2, Plus, Undo2, Redo2, Wand2 } from "lucide-react";

import FlowDiagram from "@/components/FlowDiagram";

// Context for Node Actions
const FlowActionsContext = createContext<{
  onEditNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
}>({ onEditNode: () => {}, onDeleteNode: () => {} });

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const nodeWidth = 150;
  const nodeHeight = 60;

  dagreGraph.setGraph({ rankdir: direction, nodesep: 40, ranksep: 60 });

  nodes.forEach((node) => {
    const isDecision = node.type === 'decision';
    dagreGraph.setNode(node.id, { width: isDecision ? 150 : nodeWidth, height: isDecision ? 150 : nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

// ===== Custom Nodes for Flowchart =====
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TerminatorNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  const { onEditNode, onDeleteNode } = useContext(FlowActionsContext);
  return (
    <>
      <NodeToolbar isVisible={selected} position={Position.Top} className="flex gap-1 bg-white p-1 rounded-xl shadow-lg border border-gray-100 mb-2">
        <button onClick={() => onEditNode(id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={16}/></button>
        <button onClick={() => onDeleteNode(id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
      </NodeToolbar>
      <div style={{ ...nodeStyleBase, borderRadius: 25, borderColor: "#7c3aed", background: "#ede9fe", color: "#5b21b6", width: 140, height: 50 }}>
        <NodeHandles />
        <div>{data.label || "Bắt đầu / Kết thúc"}</div>
      </div>
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProcessNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  const { onEditNode, onDeleteNode } = useContext(FlowActionsContext);
  return (
    <>
      <NodeToolbar isVisible={selected} position={Position.Top} className="flex gap-1 bg-white p-1 rounded-xl shadow-lg border border-gray-100 mb-2">
        <button onClick={() => onEditNode(id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={16}/></button>
        <button onClick={() => onDeleteNode(id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
      </NodeToolbar>
      <div style={{ ...nodeStyleBase, borderRadius: 8, borderColor: "#3b82f6", background: "#eff6ff", color: "#1e40af", width: 140, height: 50 }}>
        <NodeHandles />
        <div>{data.label || "Thao tác"}</div>
      </div>
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DecisionNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  const { onEditNode, onDeleteNode } = useContext(FlowActionsContext);
  return (
    <>
      <NodeToolbar isVisible={selected} position={Position.Top} className="flex gap-1 bg-white p-1 rounded-xl shadow-lg border border-gray-100 mb-2">
        <button onClick={() => onEditNode(id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={16}/></button>
        <button onClick={() => onDeleteNode(id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
      </NodeToolbar>
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
    </>
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
  wrongNodeIds?: string[];
  wrongEdgeIds?: string[];
}

export default function TuDoMode({ question, questionId }: Props) {
  const { refreshStudent } = useStudent();

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  
  // History for Undo/Redo
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([{ nodes: [], edges: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);

  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
  const [editVal, setEditVal] = useState("");

  const [nodeMenuOpen, setNodeMenuOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);

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
  
  const onLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges
    );
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
    saveHistory(layoutedNodes, layoutedEdges);
  }, [nodes, edges, saveHistory]);

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
    const newEdge: Edge = { 
      ...connection, 
      id: newEdgeId, 
      animated: true, 
      label: undefined,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
      }
    };
    
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
      position: { x: 50, y: 50 + nodes.length * 20 },
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

  const onEditNode = useCallback((id: string) => {
    const node = nodes.find(n => n.id === id);
    if (node) {
      setEditingNode(node);
      setEditVal(node.data.label as string);
    }
  }, [nodes]);

  const onDeleteNode = useCallback((id: string) => {
    const newNodes = nodes.filter(n => n.id !== id);
    const newEdges = edges.filter(e => e.source !== id && e.target !== id);
    setNodes(newNodes);
    setEdges(newEdges);
    saveHistory(newNodes, newEdges);
  }, [nodes, edges, saveHistory]);
  
  const editSelectedEdge = () => {
    if (selectedEdgeIds.length === 1) {
      const edge = edges.find(e => e.id === selectedEdgeIds[0]);
      if (edge) {
        setEditingEdge(edge);
        setEditVal(edge.label as string ?? "");
      }
    }
  };

  const deleteSelectedEdge = () => {
    if (selectedEdgeIds.length > 0) {
      const newEdges = edges.filter(e => !selectedEdgeIds.includes(e.id));
      setEdges(newEdges);
      setSelectedEdgeIds([]);
      saveHistory(nodes, newEdges);
    }
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
        
        // Clear errors
        setNodes(nds => nds.map(n => ({ ...n, className: "" })));
        setEdges(eds => eds.map(e => ({ ...e, className: "" })));
      } else {
        setFailCount(c => c + 1);
        
        // Highlight errors
        if (data.wrongNodeIds || data.wrongEdgeIds) {
          setNodes(nds => nds.map(n => ({
            ...n,
            className: data.wrongNodeIds?.includes(n.id) ? "error-node" : "",
          })));
          setEdges(eds => eds.map(e => ({
            ...e,
            className: data.wrongEdgeIds?.includes(e.id) ? "error-edge" : "",
          })));
        }
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
        .error-node {
          filter: drop-shadow(0 0 8px #ef4444);
          animation: pulse-red 1.5s infinite;
        }
        @keyframes pulse-red {
          0%, 100% { filter: drop-shadow(0 0 4px #ef4444); transform: scale(1); }
          50% { filter: drop-shadow(0 0 10px #ef4444); transform: scale(1.02); }
        }
        .error-edge .react-flow__edge-path {
          stroke: #ef4444 !important;
          stroke-width: 3px !important;
          animation: pulse-stroke 1.5s infinite;
        }
        @keyframes pulse-stroke {
          0%, 100% { stroke-width: 3px; }
          50% { stroke-width: 5px; }
        }
      `}</style>
      
      <div className="card w-full shadow-inner border border-gray-200 overflow-hidden relative" style={{ height: "65vh", minHeight: 450 }} ref={reactFlowWrapper}>
        <FlowActionsContext.Provider value={{ onEditNode, onDeleteNode }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDoubleClick={handleNodeDoubleClick}
            onEdgeDoubleClick={handleEdgeDoubleClick}
            onSelectionChange={({ edges: selEdges }) => {
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
            
            {/* Edge action floating toolbar */}
            {selectedEdgeIds.length === 1 && (
              <Panel position="bottom-center" className="mb-4 flex gap-1 bg-white/90 backdrop-blur-md p-1.5 rounded-xl shadow-lg border border-gray-100">
                <button onClick={editSelectedEdge} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={18}/></button>
                <button onClick={deleteSelectedEdge} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
              </Panel>
            )}

            {/* Top Left Menu for Adding Nodes */}
            <Panel position="top-left" className="m-2 flex flex-row items-center gap-2">
              <button 
                onClick={() => setNodeMenuOpen(!nodeMenuOpen)} 
                className="p-3 bg-white hover:bg-gray-50 rounded-full shadow-md border border-gray-200 text-gray-700 transition-colors z-10"
              >
                <Plus size={24} className={`transition-transform duration-300 ${nodeMenuOpen ? 'rotate-45' : ''}`} />
              </button>
              <AnimatePresence>
                {nodeMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -20, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-2 rounded-full shadow-md border border-gray-100 origin-left"
                  >
                    <button onClick={() => { addNode("terminator", "Bắt đầu"); setNodeMenuOpen(false); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Bắt đầu / Kết thúc">
                       <div className="w-8 h-4 rounded-full border-2 border-purple-500 bg-purple-100" />
                    </button>
                    <button onClick={() => { addNode("process", "Thao tác"); setNodeMenuOpen(false); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Thao tác">
                       <div className="w-8 h-5 rounded border-2 border-blue-500 bg-blue-100" />
                    </button>
                    <button onClick={() => { addNode("decision", "Điều kiện?"); setNodeMenuOpen(false); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Điều kiện">
                       <div className="w-5 h-5 border-2 border-amber-500 bg-amber-100 rotate-45 mx-1" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </Panel>

            {/* Bottom Left Menu for Tools */}
            <Panel position="bottom-left" className="m-2 mb-12 flex flex-col-reverse items-center gap-2">
              <button 
                onClick={() => setToolsMenuOpen(!toolsMenuOpen)} 
                className="p-3 bg-white hover:bg-gray-50 rounded-full shadow-md border border-gray-200 text-gray-700 transition-colors z-10"
              >
                <Settings2 size={24} className={`transition-transform duration-300 ${toolsMenuOpen ? 'rotate-90' : ''}`} />
              </button>
              <AnimatePresence>
                {toolsMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-2 bg-white/90 backdrop-blur-md p-2 rounded-full shadow-md border border-gray-100 origin-bottom"
                  >
                    <button onClick={undo} disabled={historyIndex === 0} className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-30 text-gray-700 transition-colors" title="Hoàn tác">
                      <Undo2 size={20} />
                    </button>
                    <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-30 text-gray-700 transition-colors" title="Làm lại">
                      <Redo2 size={20} />
                    </button>
                    <div className="h-px bg-gray-200 w-full"></div>
                    <button onClick={() => { onLayout(); setToolsMenuOpen(false); }} className="p-2 hover:bg-blue-50 rounded-full text-blue-600 transition-colors" title="Tự động sắp xếp">
                      <Wand2 size={20} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </Panel>
            
          </ReactFlow>
        </FlowActionsContext.Provider>
      </div>
      <div className="text-center text-xs text-gray-500 mb-2 mt-1">
        💡 Kéo thả từ các điểm tròn trên khối để nối mũi tên. Chạm đúp hoặc bấm icon ✏️ để sửa nội dung.
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
