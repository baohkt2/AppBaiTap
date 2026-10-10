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
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
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
  const [tab, setTab] = useState<"generate" | "pending" | "approved">("generate");

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm shadow-indigo-600/30">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Quản trị Hệ thống</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Animated Tabs */}
        <div className="flex p-1.5 bg-white border border-gray-200/80 rounded-2xl w-max shadow-sm overflow-x-auto max-w-full">
          {[
            { id: "generate", label: "Sinh câu hỏi", icon: Bot },
            { id: "pending", label: "Chờ duyệt", icon: ClipboardList },
            { id: "approved", label: "Đã duyệt", icon: CheckCircle2 },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as any)}
              className={`relative flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl font-medium text-sm transition-colors flex-shrink-0 ${
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
    <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-gray-100 space-y-8">
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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/questions?status=${status}`);
        const data = await res.json();
        if (!cancelled) setQuestions(data.questions ?? []);
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
      setQuestions(data2.questions ?? []);
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
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-white/60 h-48 rounded-3xl border border-gray-100" />
        ))}
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

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 shadow-sm">
          <X className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-semibold">{actionError}</p>
        </div>
      )}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {questions.map((q: any) => (
        <motion.div
          key={q.id}
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-full border border-indigo-100">
                  {MODE_LABELS[q.mode as keyof typeof MODE_LABELS] ?? q.mode}
                </span>
                <span className="px-3 py-1 bg-purple-50 text-purple-700 font-semibold text-xs rounded-full border border-purple-100">
                  {STRUCTURE_LABELS[q.type as keyof typeof STRUCTURE_LABELS] ?? q.type}
                </span>
                <span className="text-gray-400 text-xs font-mono bg-gray-50 px-2 py-1 rounded-md">{q.id}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 leading-snug">{q.data?.title ?? "Chưa có tiêu đề"}</h3>
              {q.data?.scenario && (
                <p className="text-gray-600 text-sm mt-2 leading-relaxed bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                  {q.data.scenario}
                </p>
              )}
            </div>

            {/* Quick Actions Desktop */}
            <div className="hidden sm:flex items-center gap-1 shrink-0 bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100">
              <button
                onClick={() => {
                  setEditingId(q.id);
                  setEditJson(JSON.stringify(q.data, null, 2));
                  setActionError("");
                }}
                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                title="Sửa JSON"
              >
                <Code2 className="w-5 h-5" />
              </button>
              {status === "pending" && (
                <button
                  onClick={() => handleAction(q.id, "approve")}
                  className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                  title="Duyệt"
                >
                  <Check className="w-5 h-5" />
                </button>
              )}
              {status === "approved" && (
                <button
                  onClick={() => handleAction(q.id, "unpublish")}
                  className="p-2 text-gray-500 hover:text-amber-600 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                  title="Gỡ duyệt"
                >
                  <Undo2 className="w-5 h-5" />
                </button>
              )}
              <div className="w-px h-6 bg-gray-200 mx-1"></div>
              <button
                onClick={() => handleAction(q.id, "delete")}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                title="Xóa"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Flowchart preview */}
          {q.data?.nodes && q.data?.edges && (
            <div className="bg-gradient-to-b from-gray-50/80 to-white rounded-2xl p-4 border border-gray-100 overflow-hidden">
              <FlowDiagram nodes={q.data.nodes} edges={q.data.edges} blanks={q.data.blanks ?? []} />
            </div>
          )}

          {/* Quick Actions Mobile */}
          <div className="flex sm:hidden items-center gap-2 pt-4 border-t border-gray-100 flex-wrap">
            <button
              onClick={() => {
                setEditingId(q.id);
                setEditJson(JSON.stringify(q.data, null, 2));
                setActionError("");
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
            >
              <Code2 className="w-4 h-4" /> Sửa
            </button>
            {status === "pending" && (
              <button
                onClick={() => handleAction(q.id, "approve")}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-sm font-semibold rounded-xl transition-colors"
              >
                <Check className="w-4 h-4" /> Duyệt
              </button>
            )}
            {status === "approved" && (
              <button
                onClick={() => handleAction(q.id, "unpublish")}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-semibold rounded-xl transition-colors"
              >
                <Undo2 className="w-4 h-4" /> Gỡ
              </button>
            )}
            <button
              onClick={() => handleAction(q.id, "delete")}
              className="flex-none flex items-center justify-center px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      ))}

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
                  className="w-full h-full min-h-[400px] sm:min-h-[500px] p-5 bg-[#0F172A] text-emerald-400 font-mono text-[13px] sm:text-sm rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none leading-relaxed shadow-inner"
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
