"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FlowDiagram from "@/components/FlowDiagram";
import { MODE_LABELS, STRUCTURE_LABELS } from "@/lib/config";
import {
  Lock,
  Settings,
  Bot,
  ClipboardList,
  CheckCircle2,
  Sparkles,
  LayoutTemplate,
  Layers,
  Check,
  X,
  Code2,
  Trash2,
  Undo2,
  Hash,
  FileQuestion,
  FileText
} from "lucide-react";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  // Check existing session
  useEffect(() => {
    fetch("/api/admin/auth")
      .then((r) => r.json())
      .then((d) => {
        if (d.admin) setAuthed(true);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  async function handleLogin() {
    setAuthError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (res.ok) {
      setAuthed(true);
    } else {
      setAuthError(data.error ?? "Lỗi");
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex items-center gap-3 text-indigo-600 font-medium">
          <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Đang kiểm tra...
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-indigo-50 via-white to-purple-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 max-w-sm w-full"
        >
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="text-indigo-600 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-center text-gray-800">Quản trị viên</h1>
          <p className="text-center text-gray-500 mb-6 text-sm">Đăng nhập để quản lý hệ thống bài tập</p>

          <div className="space-y-4">
            <div>
              <input
                type="password"
                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            {authError && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500 text-center font-medium">
                {authError}
              </motion.p>
            )}
            <button
              onClick={handleLogin}
              className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-gray-900/20"
            >
              Đăng nhập
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const [tab, setTab] = useState<"generate" | "pending" | "approved" | "exam">("generate");

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm shadow-indigo-600/30">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Quản trị Hệ thống</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Animated Tabs */}
        <div className="flex p-1.5 bg-white border border-gray-200/80 rounded-2xl w-max shadow-sm overflow-x-auto max-w-full">
          {[
            { id: "generate", label: "Sinh câu hỏi", icon: Bot },
            { id: "pending", label: "Chờ duyệt", icon: ClipboardList },
            { id: "approved", label: "Đã duyệt", icon: CheckCircle2 },
            { id: "exam", label: "Đề Thi (AI)", icon: FileQuestion },
          ].map((item) => (
              <button
              key={item.id}
              onClick={() => setTab(item.id as any)}
              className={`relative flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl font-medium text-sm transition-colors shrink-0 ${
                tab === item.id ? "text-indigo-700" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50/50"
              }`}
            >
              {tab === item.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-indigo-50/80 border border-indigo-100/50 rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{item.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "generate" && <GenerateTab />}
            {tab === "pending" && <QuestionListTab status="pending" />}
            {tab === "approved" && <QuestionListTab status="approved" />}
            {tab === "exam" && <ExamTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function GenerateTab() {
  const [modes, setModes] = useState<string[]>(["sap_xep"]);
  const [structures, setStructures] = useState<string[]>(["tuan_tu"]);
  const [count, setCount] = useState(1);
  const [theme, setTheme] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ id: string; title: string; success: boolean; errors?: string[] }>>([]);

  async function handleGenerate() {
    if (modes.length === 0 || structures.length === 0) {
      alert("Vui lòng chọn ít nhất một chế độ và một cấu trúc!");
      return;
    }
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modes, structures, count, theme }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([{ id: "", title: "Lỗi kết nối", success: false }]);
    } finally {
      setLoading(false);
    }
  }

  const toggleMode = (k: string) => {
    setModes((prev) => (prev.includes(k) ? prev.filter((m) => m !== k) : [...prev, k]));
  };

  const toggleStructure = (k: string) => {
    setStructures((prev) => (prev.includes(k) ? prev.filter((s) => s !== k) : [...prev, k]));
  };

  return (
    <div className="bg-white rounded-4xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Modes */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-800 font-bold text-lg">
            <LayoutTemplate className="w-5 h-5 text-indigo-500" />
            <h2>Chế độ bài tập</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(MODE_LABELS).map(([k, v]) => {
              const active = modes.includes(k);
              return (
                <div
                  key={k}
                  onClick={() => toggleMode(k)}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all duration-200 ${
                    active
                      ? "border-indigo-500 bg-indigo-50/50 shadow-[0_4px_20px_rgb(99,102,241,0.1)]"
                      : "border-gray-100 bg-white hover:border-indigo-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${active ? "text-indigo-700" : "text-gray-600"}`}>{v}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${active ? "border-indigo-500 bg-indigo-500" : "border-gray-300"}`}>
                      {active && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Structures */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-800 font-bold text-lg">
            <Layers className="w-5 h-5 text-purple-500" />
            <h2>Cấu trúc sơ đồ</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(STRUCTURE_LABELS).map(([k, v]) => {
              const active = structures.includes(k);
              return (
                <div
                  key={k}
                  onClick={() => toggleStructure(k)}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all duration-200 ${
                    active
                      ? "border-purple-500 bg-purple-50/50 shadow-[0_4px_20px_rgb(168,85,247,0.1)]"
                      : "border-gray-100 bg-white hover:border-purple-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${active ? "text-purple-700" : "text-gray-600"}`}>{v}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${active ? "border-purple-500 bg-purple-500" : "border-gray-300"}`}>
                      {active && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <hr className="border-gray-100" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Hash className="w-4 h-4 text-gray-400" /> Số lượng câu (1-5)
          </label>
          <input
            type="number"
            min={1}
            max={5}
            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-gray-800"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Sparkles className="w-4 h-4 text-amber-500" /> Chủ đề gợi ý
          </label>
          <input
            type="text"
            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400 font-medium text-gray-800"
            placeholder="Ví dụ: nấu ăn, dọn dẹp, đi học..."
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full relative overflow-hidden bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-medium py-4 rounded-xl transition-all active:scale-[0.99] shadow-lg shadow-gray-900/20"
      >
        <span className="relative z-10 flex items-center justify-center gap-2 text-base">
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang kiến tạo bằng AI...
            </>
          ) : (
            <>
              <Bot className="w-5 h-5" />
              Khởi tạo câu hỏi
            </>
          )}
        </span>
      </button>

      {/* Results */}
      {results.length > 0 && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 pt-4 border-t border-gray-100">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-500" /> Kết quả sinh
          </h3>
          <div className="grid gap-3">
            {results.map((r, i) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={i}
                className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm ${
                  r.success ? "bg-emerald-50/50 border-emerald-100" : "bg-red-50/50 border-red-100"
                }`}
              >
                <div className="mt-0.5">
                  {r.success ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <X className="w-5 h-5 text-red-500" />}
                </div>
                <div>
                  <p className={`font-semibold ${r.success ? "text-emerald-900" : "text-red-900"}`}>{r.title}</p>
                  {r.errors && <p className="text-sm mt-1 text-red-600/80 font-medium">{r.errors.join("; ")}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function QuestionListTab({ status }: { status: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editJson, setEditJson] = useState("");
  const [actionError, setActionError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/questions?status=${status}`);
        const data = await res.json();
        if (!cancelled) {
          const qs = data.questions ?? [];
          setQuestions(qs);
          if (qs.length > 0 && !qs.find((q: any) => q.id === selectedId)) {
            setSelectedId(qs[0].id);
          } else if (qs.length === 0) {
            setSelectedId(null);
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [status]);

  async function handleAction(id: string, action: string) {
    setActionError("");
    const res = await fetch("/api/admin/questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) {
      // Refresh list
      const res2 = await fetch(`/api/admin/questions?status=${status}`);
      const data2 = await res2.json();
      const qs = data2.questions ?? [];
      setQuestions(qs);
      if (qs.length > 0 && id === selectedId && action === "delete") {
         setSelectedId(qs[0].id);
      }
    } else {
      const d = await res.json();
      setActionError(d.error ?? "Lỗi");
    }
  }

  async function handleSaveEdit(id: string) {
    setActionError("");
    try {
      const parsed = JSON.parse(editJson);
      const res = await fetch("/api/admin/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "update", data: parsed }),
      });
      const d = await res.json();
      if (res.ok) {
        setEditingId(null);
        const res2 = await fetch(`/api/admin/questions?status=${status}`);
        const data2 = await res2.json();
        setQuestions(data2.questions ?? []);
      } else {
        setActionError(d.issues?.join("; ") ?? d.error ?? "Lỗi");
      }
    } catch {
      setActionError("JSON không hợp lệ");
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
           {[1, 2, 3].map((i) => (
             <div key={i} className="animate-pulse bg-white/60 h-32 rounded-2xl border border-gray-100" />
           ))}
        </div>
        <div className="lg:col-span-2">
          <div className="animate-pulse bg-white/60 h-150 rounded-3xl border border-gray-100" />
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <ClipboardList className="w-8 h-8 text-gray-300" />
        </div>
        <p className="font-semibold text-gray-600 text-lg">Không có câu hỏi nào</p>
        <p className="text-gray-400 text-sm mt-1">Danh sách hiện đang trống.</p>
      </div>
    );
  }

  const selectedQuestion = questions.find((q) => q.id === selectedId) || questions[0];

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 shadow-sm">
          <X className="w-5 h-5 shrink-0" />
          <p className="text-sm font-semibold">{actionError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT PANE: List */}
        <div className="lg:col-span-1 space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar pb-10">
          {questions.map((q: any) => {
            const isActive = q.id === selectedQuestion?.id;
            return (
              <motion.div
                key={q.id}
                layout
                onClick={() => setSelectedId(q.id)}
                className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 border-2 ${
                  isActive
                    ? "bg-indigo-50/50 border-indigo-500 shadow-md shadow-indigo-100"
                    : "bg-white border-gray-100 hover:border-indigo-200 hover:shadow-sm"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 font-semibold text-[10px] rounded-md ${isActive ? "bg-indigo-100 text-indigo-800" : "bg-gray-100 text-gray-600"}`}>
                    {MODE_LABELS[q.mode as keyof typeof MODE_LABELS] ?? q.mode}
                  </span>
                  <span className={`px-2 py-0.5 font-semibold text-[10px] rounded-md ${isActive ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-600"}`}>
                    {STRUCTURE_LABELS[q.type as keyof typeof STRUCTURE_LABELS] ?? q.type}
                  </span>
                </div>
                <h3 className={`font-bold text-sm leading-snug line-clamp-2 ${isActive ? "text-indigo-950" : "text-gray-800"}`}>
                  {q.data?.title ?? "Chưa có tiêu đề"}
                </h3>
                <p className="text-gray-500 text-xs mt-2 font-mono truncate">{q.id}</p>
              </motion.div>
            );
          })}
        </div>

        {/* RIGHT PANE: Details */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 lg:sticky lg:top-24 flex flex-col min-h-150">
          {selectedQuestion ? (
            <div className="space-y-6 flex-1 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 leading-snug">{selectedQuestion.data?.title ?? "Chưa có tiêu đề"}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-gray-400 text-xs font-mono bg-gray-50 px-2 py-1 rounded-md">{selectedQuestion.id}</span>
                  </div>
                  {selectedQuestion.data?.scenario && (
                    <p className="text-gray-600 text-sm mt-4 leading-relaxed bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                      {selectedQuestion.data.scenario}
                    </p>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-1 shrink-0 bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100">
                  <button
                    onClick={() => {
                      setEditingId(selectedQuestion.id);
                      setEditJson(JSON.stringify(selectedQuestion.data, null, 2));
                      setActionError("");
                    }}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                    title="Sửa JSON"
                  >
                    <Code2 className="w-5 h-5" />
                  </button>
                  {status === "pending" && (
                    <button
                      onClick={() => handleAction(selectedQuestion.id, "approve")}
                      className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                      title="Duyệt"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  )}
                  {status === "approved" && (
                    <button
                      onClick={() => handleAction(selectedQuestion.id, "unpublish")}
                      className="p-2 text-gray-500 hover:text-amber-600 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                      title="Gỡ duyệt"
                    >
                      <Undo2 className="w-5 h-5" />
                    </button>
                  )}
                  <div className="w-px h-6 bg-gray-200 mx-1"></div>
                  <button
                    onClick={() => handleAction(selectedQuestion.id, "delete")}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                    title="Xóa"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Flowchart preview */}
              {selectedQuestion.data?.nodes && selectedQuestion.data?.edges && (
                <div className="bg-linear-to-b from-gray-50/80 to-white rounded-2xl p-4 border border-gray-100 overflow-hidden flex-1 min-h-100 relative">
                  <FlowDiagram nodes={selectedQuestion.data.nodes} edges={selectedQuestion.data.edges} blanks={selectedQuestion.data.blanks ?? []} />
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <ClipboardList className="w-12 h-12 mb-4 opacity-50" />
              <p>Chọn một câu hỏi để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit JSON Modal */}
      <AnimatePresence>
        {editingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
              onClick={() => setEditingId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100"
            >
              <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
                <div className="flex items-center gap-2 text-gray-800 font-bold">
                  <Code2 className="w-5 h-5 text-indigo-600" /> Cập nhật mã nguồn JSON
                </div>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 sm:p-6 flex-1 overflow-hidden flex flex-col">
                <textarea
                  className="w-full h-full min-h-100 sm:min-h-125 p-5 bg-[#0F172A] text-emerald-400 font-mono text-[13px] sm:text-sm rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none leading-relaxed shadow-inner"
                  value={editJson}
                  onChange={(e) => setEditJson(e.target.value)}
                  spellCheck={false}
                />
              </div>
              <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/80 flex justify-end gap-3">
                <button
                  onClick={() => setEditingId(null)}
                  className="px-6 py-2.5 font-semibold text-gray-600 hover:bg-gray-200/50 hover:text-gray-800 rounded-xl transition-colors"
                >
                  Đóng
                </button>
                <button
                  onClick={() => handleSaveEdit(editingId)}
                  className="px-6 py-2.5 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-sm shadow-indigo-600/20 active:scale-[0.98] flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Cập nhật
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExamTab() {
  const [sourceMode, setSourceMode] = useState<"upload" | "text">("upload");
  const [documentText, setDocumentText] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [count, setCount] = useState(10);
  const [mcqRatio, setMcqRatio] = useState(80);
  const [diffNhanBiet, setDiffNhanBiet] = useState(4);
  const [diffThongHieu, setDiffThongHieu] = useState(4);
  const [diffVanDung, setDiffVanDung] = useState(2);
  const [loading, setLoading] = useState(false);
  const [loadingExams, setLoadingExams] = useState(true);
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<ExamDetail | null>(null);
  const [examDetailLoading, setExamDetailLoading] = useState(false);
  const [examDetailError, setExamDetailError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadExams() {
      setLoadingExams(true);
      try {
        const res = await fetch("/api/admin/exams");
        const data = await res.json();
        if (!cancelled) {
          const nextExams = (data.exams ?? []) as ExamSummary[];
          setExams(nextExams);
          if (!selectedExamId && nextExams.length > 0) {
            setSelectedExamId(nextExams[0].id);
          }
          if (selectedExamId && !nextExams.some((exam) => exam.id === selectedExamId)) {
            setSelectedExamId(nextExams[0]?.id ?? null);
          }
        }
      } catch {
        if (!cancelled) {
          setExams([]);
        }
      } finally {
        if (!cancelled) setLoadingExams(false);
      }
    }

    loadExams();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedExamId) {
      setSelectedExam(null);
      return;
    }

    let cancelled = false;

    async function loadExamDetail() {
      setExamDetailLoading(true);
      setExamDetailError("");
      try {
        const res = await fetch(`/api/admin/exams?id=${selectedExamId}`);
        const data = await res.json();
        if (!cancelled) {
          setSelectedExam(data.exam ?? null);
        }
      } catch {
        if (!cancelled) {
          setSelectedExam(null);
          setExamDetailError("Không thể tải nội dung đề thi.");
        }
      } finally {
        if (!cancelled) setExamDetailLoading(false);
      }
    }

    loadExamDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedExamId]);

  async function reloadExams() {
    const res = await fetch("/api/admin/exams");
    const data = await res.json();
    const nextExams = (data.exams ?? []) as ExamSummary[];
    setExams(nextExams);
    if (!nextExams.some((exam) => exam.id === selectedExamId)) {
      setSelectedExamId(nextExams[0]?.id ?? null);
    }
  }

  async function handleExamAction(id: string, action: "publish" | "unpublish" | "delete") {
    const res = await fetch("/api/admin/exams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Lỗi thao tác đề thi");
      return;
    }

    if (action === "delete" && selectedExamId === id) {
      setSelectedExam(null);
    }
    await reloadExams();
  }

  function buildFormData() {
    const formData = new FormData();
    formData.append("count", String(count));
    formData.append("mcqRatio", String(mcqRatio / 100));
    formData.append("nhan_biet", String(diffNhanBiet));
    formData.append("thong_hieu", String(diffThongHieu));
    formData.append("van_dung", String(diffVanDung));

    if (sourceMode === "upload" && sourceFile) {
      formData.append("file", sourceFile);
    } else {
      formData.append("documentText", documentText);
    }

    return formData;
  }

  async function handleGenerate() {
    if (sourceMode === "upload" && !sourceFile) {
      alert("Vui lòng chọn file tài liệu nguồn!");
      return;
    }
    if (sourceMode === "text" && !documentText.trim()) {
      alert("Vui lòng dán nội dung tài liệu nguồn!");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const body = buildFormData();
      const res = await fetch("/api/admin/exams/generate", {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error + (data.details ? ": " + JSON.stringify(data.details) : ""));
      }
      setResult(data);
      await reloadExams();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-4xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Col: Configs */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-gray-800 font-bold text-lg mb-4">
            <Settings className="w-5 h-5 text-indigo-500" />
            <h2>Cấu hình Đề thi</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Tổng số câu hỏi</label>
              <input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">% Trắc nghiệm</label>
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={100} step={10} value={mcqRatio} onChange={(e) => setMcqRatio(Number(e.target.value))} className="flex-1" />
                <span className="text-sm font-bold w-12 text-right">{mcqRatio}%</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">Phân bố độ khó (số câu)</label>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <div className="text-xs font-semibold text-emerald-700 mb-1">Nhận biết</div>
                <input type="number" min={0} value={diffNhanBiet} onChange={e => setDiffNhanBiet(Number(e.target.value))} className="w-full bg-white px-2 py-1.5 rounded border border-emerald-200 outline-none text-center" />
              </div>
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                <div className="text-xs font-semibold text-amber-700 mb-1">Thông hiểu</div>
                <input type="number" min={0} value={diffThongHieu} onChange={e => setDiffThongHieu(Number(e.target.value))} className="w-full bg-white px-2 py-1.5 rounded border border-amber-200 outline-none text-center" />
              </div>
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                <div className="text-xs font-semibold text-rose-700 mb-1">Vận dụng</div>
                <input type="number" min={0} value={diffVanDung} onChange={e => setDiffVanDung(Number(e.target.value))} className="w-full bg-white px-2 py-1.5 rounded border border-rose-200 outline-none text-center" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Document Source */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-800 font-bold text-lg mb-4">
            <FileText className="w-5 h-5 text-blue-500" />
            <h2>Tài liệu Nguồn</h2>
          </div>
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${sourceMode === "upload" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"}`}
              onClick={() => setSourceMode("upload")}
            >
              Upload file
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${sourceMode === "text" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"}`}
              onClick={() => setSourceMode("text")}
            >
              Dán text
            </button>
          </div>

          {sourceMode === "upload" ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Tải lên PDF, Word hoặc file văn bản để AI đọc và sinh đề thi tự động.</p>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md"
                onChange={(e) => setSourceFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
              />
              {sourceFile && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-sm text-indigo-800">
                  File đã chọn: <span className="font-semibold">{sourceFile.name}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Copy và dán nội dung bài học, sách giáo khoa hoặc tài liệu tham khảo vào đây để AI đọc và sinh đề thi tự động.</p>
              <textarea
                className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none leading-relaxed text-sm"
                placeholder="Dán nội dung tài liệu vào đây..."
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full relative overflow-hidden bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-medium py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 text-base"
      >
        {loading ? (
          <>
             <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
             Đang dùng AI phân tích tài liệu và tạo đề thi...
          </>
        ) : (
          <><Bot className="w-5 h-5" /> Khởi tạo Đề thi Tự động</>
        )}
      </button>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm font-semibold">
          Lỗi: {error}
        </div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-lg">
             <CheckCircle2 className="w-6 h-6" /> Tạo đề thi thành công!
          </div>
          <p className="text-emerald-700 text-sm">Đề thi đã được lưu vào cơ sở dữ liệu với ID: <strong>{result.examId}</strong></p>
          <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
             <h3 className="font-bold text-gray-800 text-lg mb-2">{result.data.title}</h3>
             <p className="text-sm text-gray-600 mb-4">{result.data.description}</p>
             <div className="flex gap-4 text-sm">
                <span className="px-3 py-1 bg-gray-100 rounded-lg">⏱ {result.data.timeLimit ?? "Không giới hạn"} phút</span>
                <span className="px-3 py-1 bg-gray-100 rounded-lg">🏆 {result.data.maxScore} điểm</span>
                <span className="px-3 py-1 bg-gray-100 rounded-lg">📝 {result.data.questions.length} câu hỏi</span>
             </div>
             <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Đề đang ở trạng thái nháp. Hãy kiểm tra danh sách bên dưới và bấm Xuất bản khi sẵn sàng.
             </div>
          </div>
          <p className="text-xs text-emerald-600/80">Bạn có thể xem chi tiết đề thi ở màn hình Quản lý Đề.</p>
        </motion.div>
      )}

      <div className="pt-2 border-t border-gray-100 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">Danh sách đề thi</h3>
            <p className="text-sm text-gray-500">Quản lý trạng thái phát hành của các đề đã tạo.</p>
          </div>
          <button
            onClick={reloadExams}
            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
          >
            Làm mới
          </button>
        </div>

        {loadingExams ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-gray-50 animate-pulse" />)}
          </div>
        ) : exams.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-6 text-center text-sm text-gray-500">
            Chưa có đề thi nào.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-4 items-start">
            <div className="space-y-3 max-h-205 overflow-y-auto pr-1 custom-scrollbar">
              {exams.map((exam) => {
                const active = exam.id === selectedExamId;
                return (
                  <button
                    key={exam.id}
                    onClick={() => setSelectedExamId(exam.id)}
                    className={`w-full text-left rounded-2xl border p-4 shadow-sm transition-all ${active ? "border-indigo-500 bg-indigo-50/50" : "border-gray-100 bg-white hover:border-indigo-200"}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-md ${exam.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {exam.status === "published" ? "Đã xuất bản" : "Nháp"}
                      </span>
                      <span className="px-2 py-1 text-xs font-semibold rounded-md bg-gray-100 text-gray-600">{exam.questionCount} câu</span>
                    </div>
                    <h4 className="font-bold text-gray-800 line-clamp-2">{exam.title}</h4>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">{exam.description}</p>
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs text-gray-400">
                      <span className="font-mono break-all">{exam.id}</span>
                      <span>{exam.timeLimit ? `${exam.timeLimit} phút` : "Không giới hạn"}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm min-h-155 space-y-5">
              {examDetailLoading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-8 w-2/3 rounded bg-gray-100" />
                  <div className="h-4 w-1/2 rounded bg-gray-100" />
                  <div className="h-40 rounded-2xl bg-gray-50" />
                  <div className="h-40 rounded-2xl bg-gray-50" />
                </div>
              ) : selectedExam ? (
                <>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-md ${selectedExam.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {selectedExam.status === "published" ? "Đã xuất bản" : "Nháp"}
                      </span>
                      <span className="px-2 py-1 text-xs font-semibold rounded-md bg-gray-100 text-gray-600">{selectedExam.exam.questions.length} câu</span>
                      <span className="px-2 py-1 text-xs font-semibold rounded-md bg-indigo-50 text-indigo-700">{selectedExam.exam.timeLimit ? `${selectedExam.exam.timeLimit} phút` : "Không giới hạn"}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-2xl font-bold text-gray-800 leading-tight">{selectedExam.exam.title}</h4>
                        <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{selectedExam.exam.description ?? "Không có mô tả."}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        {selectedExam.status === "published" ? (
                          <button
                            onClick={() => handleExamAction(selectedExam.id, "unpublish")}
                            className="px-4 py-2 rounded-xl bg-amber-50 text-amber-700 font-semibold hover:bg-amber-100 transition-colors flex items-center gap-2"
                          >
                            <Undo2 className="w-4 h-4" /> Gỡ xuất bản
                          </button>
                        ) : (
                          <button
                            onClick={() => handleExamAction(selectedExam.id, "publish")}
                            className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Xuất bản
                          </button>
                        )}
                        <button
                          onClick={() => handleExamAction(selectedExam.id, "delete")}
                          className="px-4 py-2 rounded-xl bg-red-50 text-red-700 font-semibold hover:bg-red-100 transition-colors flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> Xóa
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 font-mono break-all">{selectedExam.id}</p>
                  </div>

                  {examDetailError && (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {examDetailError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tổng điểm</p>
                      <p className="mt-1 text-2xl font-bold text-gray-800">{selectedExam.exam.maxScore}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Thời gian</p>
                      <p className="mt-1 text-2xl font-bold text-gray-800">{selectedExam.exam.timeLimit ?? "Không giới hạn"}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Số câu</p>
                      <p className="mt-1 text-2xl font-bold text-gray-800">{selectedExam.exam.questions.length}</p>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-130 overflow-y-auto pr-1 custom-scrollbar">
                    {selectedExam.exam.questions.map((question, index) => (
                      <div key={question.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Câu {index + 1}</p>
                            <h5 className="mt-1 text-base font-bold text-gray-800 whitespace-pre-wrap">{question.content}</h5>
                          </div>
                          <span className={`shrink-0 px-2 py-1 text-xs font-semibold rounded-md ${question.type === "mcq" ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700"}`}>
                            {question.type === "mcq" ? "Trắc nghiệm" : "Tự luận"}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs font-semibold mb-3">
                          <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-600">{question.difficulty === "nhan_biet" ? "Nhận biết" : question.difficulty === "thong_hieu" ? "Thông hiểu" : "Vận dụng"}</span>
                          <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700">{question.scoreWeight} điểm</span>
                          <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 font-mono">{question.id}</span>
                        </div>

                        {question.type === "mcq" && question.options?.length ? (
                          <div className="grid gap-2">
                            {question.options.map((option, optionIndex) => {
                              const isCorrect = String(optionIndex) === question.correctAnswer;
                              return (
                                <div key={optionIndex} className={`rounded-xl border px-3 py-2 text-sm ${isCorrect ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-gray-100 bg-gray-50 text-gray-700"}`}>
                                  <span className="mr-2 font-bold">{String.fromCharCode(65 + optionIndex)}.</span>
                                  {option}
                                  {isCorrect && <span className="ml-2 text-xs font-semibold uppercase tracking-wide">Đáp án đúng</span>}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                            <span className="font-semibold text-gray-500">Đáp án mẫu:</span> {question.correctAnswer}
                          </div>
                        )}

                        {question.explanation && (
                          <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                            <span className="font-semibold">Giải thích:</span> {question.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-full min-h-125 items-center justify-center text-center text-gray-400">
                  <div>
                    <ClipboardList className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p className="font-semibold">Chọn một đề thi để xem nội dung chi tiết</p>
                    <p className="mt-1 text-sm">Các câu hỏi, đáp án và lời giải sẽ hiện ở khung này.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type ExamSummary = {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  timeLimit: number | null;
  maxScore: number;
  questionCount: number;
  createdAt: string | null;
};

type ExamDetail = {
  id: string;
  status: "draft" | "published";
  createdAt: string | null;
  exam: {
    title: string;
    description?: string;
    timeLimit: number | null;
    maxScore: number;
    questions: Array<{
      id: string;
      type: "mcq" | "essay";
      difficulty: "nhan_biet" | "thong_hieu" | "van_dung";
      content: string;
      options?: string[];
      correctAnswer: string;
      explanation?: string;
      scoreWeight: number;
    }>;
  };
};
