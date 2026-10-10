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
  FileText,
  Pencil,
  Save,
  RotateCcw,
  Plus,
  Users,
  FileBarChart2
} from "lucide-react";

type ExamDraftQuestion = {
  id: string;
  type: "mcq" | "essay";
  difficulty: "nhan_biet" | "thong_hieu" | "van_dung";
  content: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  scoreWeight: number;
};

type ExamDraft = {
  title: string;
  description?: string;
  timeLimit: number | null;
  maxScore: number;
  showAnswersAfterSubmit: boolean;
  questions: ExamDraftQuestion[];
};

function cloneExamToDraft(exam: ExamDetail["exam"]): ExamDraft {
  return {
    title: exam.title,
    description: exam.description ?? "",
    timeLimit: exam.timeLimit,
    maxScore: exam.maxScore,
    showAnswersAfterSubmit: exam.showAnswersAfterSubmit,
    questions: exam.questions.map((question) => ({
      ...question,
      options: question.options ? [...question.options] : undefined,
      explanation: question.explanation ?? "",
    })),
  };
}

function normalizeDraftExam(draft: ExamDraft): ExamDraft {
  return {
    title: draft.title.trim(),
    description: draft.description?.trim() || undefined,
    timeLimit: draft.timeLimit,
    maxScore: draft.maxScore,
    showAnswersAfterSubmit: draft.showAnswersAfterSubmit,
    questions: draft.questions.map((question, index) => ({
      ...question,
      id: question.id || `draft-q-${index + 1}`,
      content: question.content.trim(),
      options: question.type === "mcq" ? (question.options ?? []).map((option) => option.trim()).filter(Boolean) : undefined,
      correctAnswer: question.correctAnswer.trim(),
      explanation: question.explanation?.trim() || undefined,
    })),
  };
}

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
  const [tab, setTab] = useState<"dashboard" | "generate" | "pending" | "approved" | "exam" | "students" | "submissions">("dashboard");

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
            { id: "dashboard", label: "Tổng quan", icon: LayoutTemplate },
            { id: "generate", label: "Sinh câu hỏi", icon: Bot },
            { id: "pending", label: "Chờ duyệt", icon: ClipboardList },
            { id: "approved", label: "Đã duyệt", icon: CheckCircle2 },
            { id: "exam", label: "Đề Thi (AI)", icon: FileQuestion },
            { id: "students", label: "Học sinh", icon: Users },
            { id: "submissions", label: "Bài làm", icon: FileBarChart2 },
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
            {tab === "dashboard" && <DashboardTab />}
            {tab === "generate" && <GenerateTab />}
            {tab === "pending" && <QuestionListTab status="pending" />}
            {tab === "approved" && <QuestionListTab status="approved" />}
            {tab === "exam" && <ExamTab />}
            {tab === "students" && <StudentTab />}
            {tab === "submissions" && <SubmissionTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function DashboardTab() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/dashboard?range=7d&class=all")
      .then((res) => res.json())
      .then((data) => {
        if (mounted) setDashboard(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">Đang tải dashboard...</div>;
  }

  const summary = dashboard?.summary ?? {
    activeStudents: 0,
    totalStudents: 0,
    practiceCount: 0,
    practiceAccuracy: 0,
    examCount: 0,
    averageExamScore: 0,
    pendingQuestions: 0,
    geminiToday: 0,
  };

  const kpis = [
    { label: "Học sinh hoạt động", value: `${summary.activeStudents}/${summary.totalStudents}` },
    { label: "Lượt luyện tập", value: `${summary.practiceCount}`, suffix: `${summary.practiceAccuracy}% đúng` },
    { label: "Bài thi đã nộp", value: `${summary.examCount}`, suffix: `${summary.averageExamScore}% TB` },
    { label: "Câu chờ duyệt", value: `${summary.pendingQuestions}` },
    { label: "Lượt gọi Gemini", value: `${summary.geminiToday}` },
  ];

  return (
    <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Tổng quan</h2>
          <p className="text-sm text-gray-500">Nhìn nhanh tình hình lớp học trong tuần qua.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {kpis.map((item) => (
          <div key={item.label} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-800">{item.value}</p>
            {item.suffix && <p className="mt-1 text-xs text-gray-500">{item.suffix}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="font-semibold text-gray-800">Hoạt động gần đây</h3>
          <div className="mt-3 space-y-2">
            {(dashboard?.recentActivity ?? []).slice(0, 5).map((row: any) => (
              <div key={`${row.kind}-${row.id}`} className="rounded-xl border border-gray-100 bg-white p-3 text-sm text-gray-700">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{row.studentName}</span>
                  <span className="text-xs text-gray-500">{row.kind === "practice" ? "Luyện tập" : "Đề thi"}</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">{row.className} • {row.title}</div>
              </div>
            ))}
            {(!dashboard?.recentActivity || dashboard.recentActivity.length === 0) && (
              <div className="text-sm text-gray-500">Chưa có hoạt động trong khoảng thời gian này.</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="font-semibold text-gray-800">Cảnh báo</h3>
          <div className="mt-3 space-y-2">
            {(dashboard?.alerts ?? []).map((alert: any) => (
              <div key={alert.id} className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                {alert.label}: <span className="font-bold">{alert.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <LessonLinkEditor />
      </div>
    </div>
  );
}

function LessonLinkEditor() {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (mounted) setValue(data.value ?? "");
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonDocUrl: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi cập nhật link");
      setStatus("Đã cập nhật link tài liệu.");
    } catch (error) {
      setStatus((error as Error).message || "Lỗi cập nhật link");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <h3 className="font-semibold text-gray-800">Link tài liệu bài học</h3>
      <div className="mt-3 space-y-3">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          placeholder="https://docs.google.com/document/..."
        />
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : "Lưu link"}
          </button>
          {status && <span className="text-sm text-gray-600">{status}</span>}
        </div>
      </div>
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

function StudentTab() {
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/students?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (!cancelled) {
          const nextStudents = data.students ?? [];
          setStudents(nextStudents);
          if (nextStudents.length > 0 && !nextStudents.some((student: any) => student.id === selectedStudentId)) {
            setSelectedStudentId(nextStudents[0].id);
          }
          if (nextStudents.length === 0) {
            setSelectedStudentId(null);
          }
        }
      } catch {
        if (!cancelled) setStudents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [query, selectedStudentId]);

  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? null;

  return (
    <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Quản lý học sinh</h2>
          <p className="text-sm text-gray-500">Danh sách học sinh, điểm tích lũy và số bài đã làm.</p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên, lớp hoặc mã học sinh"
          className="w-full md:w-96 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-50" />)}
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">Chưa có học sinh nào.</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
            {students.map((student) => (
              <button
                key={student.id}
                onClick={() => setSelectedStudentId(student.id)}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${selectedStudentId === student.id ? "border-indigo-500 bg-indigo-50/50" : "border-gray-100 bg-white hover:border-indigo-200"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-800">{student.name}</p>
                    <p className="text-sm text-gray-500">{student.class}</p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">{student.examCount} đề</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-gray-600">
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">{student.totalPoints} điểm</span>
                  <span className="rounded-md bg-indigo-50 px-2 py-1 text-indigo-700">{student.practiceCount} bài luyện</span>
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
            {selectedStudent ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">{selectedStudent.name}</h3>
                  <p className="text-sm text-gray-500">{selectedStudent.class}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tổng điểm</p>
                    <p className="mt-1 text-2xl font-bold text-gray-800">{selectedStudent.totalPoints}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bài luyện</p>
                    <p className="mt-1 text-2xl font-bold text-gray-800">{selectedStudent.practiceCount}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bài thi</p>
                    <p className="mt-1 text-2xl font-bold text-gray-800">{selectedStudent.examCount}</p>
                  </div>
                </div>
                <p className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">Mã học sinh: <span className="font-mono font-semibold text-gray-800">{selectedStudent.id}</span></p>
              </div>
            ) : (
              <div className="flex min-h-72 items-center justify-center text-gray-400">Chọn một học sinh để xem chi tiết</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SubmissionTab() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [submissionDetail, setSubmissionDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [filters, setFilters] = useState({
    kind: "all",
    className: "",
    q: "",
    mode: "",
    status: "",
    correct: "",
    from: "",
    to: "",
  });
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          kind: filters.kind,
          class: filters.className,
          q: filters.q,
          mode: filters.mode,
          status: filters.status,
          correct: filters.correct,
          from: filters.from,
          to: filters.to,
          page: String(page),
          pageSize: String(pageSize),
        });

        const res = await fetch(`/api/admin/submissions?${params.toString()}`);
        const data = await res.json();
        if (!cancelled) {
          const nextSubmissions = data.submissions ?? [];
          setSubmissions(nextSubmissions);
          setTotal(Number(data.total ?? nextSubmissions.length));
          if (nextSubmissions.length > 0 && !nextSubmissions.some((submission: any) => submission.id === selectedSubmissionId)) {
            setSelectedSubmissionId(nextSubmissions[0].id);
          }
          if (nextSubmissions.length === 0) {
            setSelectedSubmissionId(null);
            setSubmissionDetail(null);
          }
        }
      } catch {
        if (!cancelled) setSubmissions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [filters, page, pageSize, selectedSubmissionId]);

  useEffect(() => {
    if (!selectedSubmissionId) {
      setSubmissionDetail(null);
      return;
    }

    let cancelled = false;
    async function loadDetail() {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/admin/submissions?id=${selectedSubmissionId}`);
        const data = await res.json();
        if (!cancelled) {
          setSubmissionDetail(data);
        }
      } catch {
        if (!cancelled) setSubmissionDetail(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }
    loadDetail();
    return () => { cancelled = true; };
  }, [selectedSubmissionId]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Quản lý bài làm</h2>
        <p className="text-sm text-gray-500">Xem các bài nộp của học sinh và chi tiết từng bài.</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-6">
        <select value={filters.kind} onChange={(e) => { setFilters((prev) => ({ ...prev, kind: e.target.value })); setPage(1); }} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
          <option value="all">Tất cả</option>
          <option value="algo">Luyện tập</option>
          <option value="exam">Đề thi</option>
        </select>
        <input value={filters.className} onChange={(e) => { setFilters((prev) => ({ ...prev, className: e.target.value })); setPage(1); }} placeholder="Lớp" className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm" />
        <input value={filters.q} onChange={(e) => { setFilters((prev) => ({ ...prev, q: e.target.value })); setPage(1); }} placeholder="Tìm tên / đề" className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm" />
        <select value={filters.mode} onChange={(e) => { setFilters((prev) => ({ ...prev, mode: e.target.value })); setPage(1); }} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
          <option value="">Chế độ</option>
          <option value="sap_xep">sap_xep</option>
          <option value="dien_khuyet">dien_khuyet</option>
          <option value="tu_do">tu_do</option>
        </select>
        <select value={filters.correct} onChange={(e) => { setFilters((prev) => ({ ...prev, correct: e.target.value })); setPage(1); }} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
          <option value="">Kết quả</option>
          <option value="true">Đúng</option>
          <option value="false">Sai</option>
        </select>
        <select value={filters.status} onChange={(e) => { setFilters((prev) => ({ ...prev, status: e.target.value })); setPage(1); }} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
          <option value="">Trạng thái</option>
          <option value="submitted">submitted</option>
          <option value="graded">graded</option>
        </select>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-50" />)}
        </div>
      ) : submissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">Không có bài làm khớp bộ lọc.</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
            {submissions.map((submission) => (
              <button
                key={submission.id}
                onClick={() => setSelectedSubmissionId(submission.id)}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${selectedSubmissionId === submission.id ? "border-indigo-500 bg-indigo-50/50" : "border-gray-100 bg-white hover:border-indigo-200"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-800 line-clamp-2">{submission.examTitle || submission.title}</p>
                    <p className="text-sm text-gray-500">{submission.studentName || submission.studentId}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{Math.round(Number(submission.totalScore ?? 0) * 100) / 100}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                  <span>{submission.kind === "algo" ? "🧩 Luyện tập" : "📝 Đề thi"}</span>
                  <span>{submission.status || (submission.correct ? "Đúng" : "Sai")}</span>
                </div>
                <p className="mt-3 text-xs text-gray-400 font-mono break-all">{submission.id}</p>
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
            {detailLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-8 w-2/3 rounded bg-gray-200" />
                <div className="h-4 w-1/2 rounded bg-gray-200" />
                <div className="h-40 rounded-2xl bg-gray-200" />
              </div>
            ) : submissionDetail?.submission && submissionDetail?.exam ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">{submissionDetail.exam.exam.title}</h3>
                  <p className="text-sm text-gray-500">{submissionDetail.submission.student_name || submissionDetail.submission.student_id}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Điểm</p>
                    <p className="mt-1 text-2xl font-bold text-gray-800">{Math.round(Number(submissionDetail.submission.total_score ?? 0) * 100) / 100}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Trạng thái</p>
                    <p className="mt-1 text-lg font-bold text-gray-800">{submissionDetail.submission.status}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Số câu</p>
                    <p className="mt-1 text-2xl font-bold text-gray-800">{submissionDetail.exam.exam.questions.length}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {submissionDetail.exam.exam.questions.map((question: any, index: number) => {
                    const answer = submissionDetail.submission.answers?.[question.id] ?? "";
                    return (
                      <div key={question.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Câu {index + 1}</p>
                            <p className="mt-1 font-semibold text-gray-800 whitespace-pre-wrap">{question.content}</p>
                          </div>
                          <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">{question.type}</span>
                        </div>
                        <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                          <span className="font-semibold text-gray-500">Bài làm:</span> {typeof answer === "string" ? answer : JSON.stringify(answer)}
                        </div>
                        <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
                          <span className="font-semibold">Đáp án mẫu:</span> {question.type === "mcq" ? `${question.correctAnswer}` : question.correctAnswer}
                        </div>
                        {question.explanation && (
                          <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
                            <span className="font-semibold">Giải thích:</span> {question.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex min-h-72 items-center justify-center text-gray-400">Chọn một bài làm để xem chi tiết</div>
            )}
          </div>
        </div>
      )}

      {submissions.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
          <p className="text-sm text-gray-500">Tổng: {total} bài làm</p>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50">Trước</button>
            <span className="text-sm text-gray-600">{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage((prev) => Math.min(pages, prev + 1))} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50">Sau</button>
          </div>
        </div>
      )}
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
  const [editExam, setEditExam] = useState<ExamDraft | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [examDetailLoading, setExamDetailLoading] = useState(false);
  const [examDetailError, setExamDetailError] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
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
      setEditExam(null);
      setEditMode(false);
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
          const exam = data.exam ?? null;
          setSelectedExam(exam);
          if (exam && !editMode) {
            setEditExam(cloneExamToDraft(exam.exam));
          }
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
  }, [selectedExamId, editMode]);

  useEffect(() => {
    if (selectedExam && !editMode) {
      setEditExam(cloneExamToDraft(selectedExam.exam));
    }
  }, [selectedExam, editMode]);

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

  function startEditing() {
    if (!selectedExam) return;
    setEditExam(cloneExamToDraft(selectedExam.exam));
    setEditMode(true);
  }

  function cancelEditing() {
    if (selectedExam) {
      setEditExam(cloneExamToDraft(selectedExam.exam));
    }
    setEditMode(false);
  }

  function updateExamField<K extends keyof ExamDraft>(field: K, value: ExamDraft[K]) {
    setEditExam((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function updateQuestion(index: number, updater: (question: ExamDraft["questions"][number]) => ExamDraft["questions"][number]) {
    setEditExam((prev) => {
      if (!prev) return prev;
      const nextQuestions = prev.questions.map((question, questionIndex) => (questionIndex === index ? updater(question) : question));
      return { ...prev, questions: nextQuestions };
    });
  }

  function addQuestion() {
    setEditExam((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: [
          ...prev.questions,
          {
            id: `draft-${Date.now()}`,
            type: "mcq",
            difficulty: "nhan_biet",
            content: "",
            options: ["", "", "", ""],
            correctAnswer: "0",
            explanation: "",
            scoreWeight: 1,
          },
        ],
      };
    });
  }

  function removeQuestion(index: number) {
    setEditExam((prev) => {
      if (!prev) return prev;
      const nextQuestions = prev.questions.filter((_, questionIndex) => questionIndex !== index);
      return { ...prev, questions: nextQuestions };
    });
  }

  async function saveEditedExam() {
    if (!selectedExam || !editExam) return;

    setSaveLoading(true);
    setError("");
    try {
      const normalized = normalizeDraftExam(editExam);
      const res = await fetch("/api/admin/exams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedExam.id, action: "update", exam: normalized }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Lỗi lưu đề thi");
      }

      setEditMode(false);
      await reloadExams();
      const refresh = await fetch(`/api/admin/exams?id=${selectedExam.id}`);
      const refreshData = await refresh.json();
      setSelectedExam(refreshData.exam ?? null);
      setEditExam(refreshData.exam ? cloneExamToDraft(refreshData.exam.exam) : null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaveLoading(false);
    }
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
                        {!editMode ? (
                          <button
                            onClick={startEditing}
                            className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 transition-colors flex items-center gap-2"
                          >
                            <Pencil className="w-4 h-4" /> Chỉnh sửa
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={saveEditedExam}
                              disabled={saveLoading}
                              className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 disabled:opacity-60 transition-colors flex items-center gap-2"
                            >
                              <Save className="w-4 h-4" /> {saveLoading ? "Đang lưu..." : "Lưu thay đổi"}
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2"
                            >
                              <RotateCcw className="w-4 h-4" /> Hủy
                            </button>
                          </>
                        )}
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

                  {!editMode && (
                    <>
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
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Hiển thị đáp án sau nộp</p>
                        <p className="mt-1 text-sm font-semibold text-gray-800">{selectedExam.exam.showAnswersAfterSubmit ? "Có" : "Không"}</p>
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
                  )}

                  {editMode && editExam && (
                    <div className="space-y-4 max-h-[calc(100vh-320px)] overflow-y-auto pr-1 custom-scrollbar">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-semibold text-gray-700">Tên đề thi</label>
                          <input
                            value={editExam.title}
                            onChange={(e) => updateExamField("title", e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-semibold text-gray-700">Mô tả</label>
                          <textarea
                            value={editExam.description ?? ""}
                            onChange={(e) => updateExamField("description", e.target.value)}
                            className="w-full min-h-28 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">Thời gian (phút)</label>
                          <input
                            type="number"
                            min={0}
                            value={editExam.timeLimit ?? ""}
                            onChange={(e) => updateExamField("timeLimit", e.target.value === "" ? null : Number(e.target.value))}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">Tổng điểm</label>
                          <input
                            type="number"
                            min={1}
                            value={editExam.maxScore}
                            onChange={(e) => updateExamField("maxScore", Number(e.target.value))}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                        <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                          <input
                            type="checkbox"
                            checked={editExam.showAnswersAfterSubmit}
                            onChange={(e) => updateExamField("showAnswersAfterSubmit", e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          Chỉ hiển thị đáp án và lời giải sau khi học sinh nộp bài
                        </label>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-2">
                        <div>
                          <h5 className="font-bold text-gray-800">Danh sách câu hỏi</h5>
                          <p className="text-sm text-gray-500">Chỉnh trực tiếp từng câu, đáp án và lời giải.</p>
                        </div>
                        <button
                          onClick={addQuestion}
                          className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
                        >
                          <Plus className="h-4 w-4" /> Thêm câu
                        </button>
                      </div>

                      <div className="space-y-3">
                        {editExam.questions.map((question, index) => (
                          <div key={question.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Câu {index + 1}</p>
                                <p className="text-xs text-gray-400 font-mono">{question.id}</p>
                              </div>
                              <button
                                onClick={() => removeQuestion(index)}
                                className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                              >
                                Xóa câu
                              </button>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-semibold text-gray-700">Nội dung câu hỏi</label>
                                <textarea
                                  value={question.content}
                                  onChange={(e) => updateQuestion(index, (current) => ({ ...current, content: e.target.value }))}
                                  className="w-full min-h-24 rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Loại câu</label>
                                <select
                                  value={question.type}
                                  onChange={(e) =>
                                    updateQuestion(index, (current) =>
                                      e.target.value === "mcq"
                                        ? { ...current, type: "mcq", options: current.options?.length ? current.options : ["", "", "", ""], correctAnswer: current.correctAnswer || "0" }
                                        : { ...current, type: "essay", options: undefined, correctAnswer: current.correctAnswer || "" }
                                    )
                                  }
                                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                >
                                  <option value="mcq">Trắc nghiệm</option>
                                  <option value="essay">Tự luận</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Độ khó</label>
                                <select
                                  value={question.difficulty}
                                  onChange={(e) => updateQuestion(index, (current) => ({ ...current, difficulty: e.target.value as ExamDraftQuestion["difficulty"] }))}
                                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                >
                                  <option value="nhan_biet">Nhận biết</option>
                                  <option value="thong_hieu">Thông hiểu</option>
                                  <option value="van_dung">Vận dụng</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Điểm</label>
                                <input
                                  type="number"
                                  min={0.25}
                                  step={0.25}
                                  value={question.scoreWeight}
                                  onChange={(e) => updateQuestion(index, (current) => ({ ...current, scoreWeight: Number(e.target.value) }))}
                                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                />
                              </div>

                              {question.type === "mcq" ? (
                                <div className="space-y-3 md:col-span-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <label className="text-sm font-semibold text-gray-700">Đáp án lựa chọn</label>
                                    <button
                                      onClick={() =>
                                        updateQuestion(index, (current) => ({
                                          ...current,
                                          options: [...(current.options ?? []), ""],
                                        }))
                                      }
                                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                                    >
                                      <Plus className="h-3 w-3" /> Thêm đáp án
                                    </button>
                                  </div>
                                  <div className="grid gap-2">
                                    {(question.options ?? []).map((option, optionIndex) => (
                                      <div key={optionIndex} className="flex gap-2">
                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white font-bold text-gray-600">{String.fromCharCode(65 + optionIndex)}</span>
                                        <input
                                          value={option}
                                          onChange={(e) =>
                                            updateQuestion(index, (current) => {
                                              const nextOptions = [...(current.options ?? [])];
                                              nextOptions[optionIndex] = e.target.value;
                                              return { ...current, options: nextOptions };
                                            })
                                          }
                                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                        <button
                                          onClick={() =>
                                            updateQuestion(index, (current) => {
                                              const nextOptions = [...(current.options ?? [])].filter((_, idx) => idx !== optionIndex);
                                              return { ...current, options: nextOptions };
                                            })
                                          }
                                          className="rounded-xl bg-red-50 px-3 text-sm font-semibold text-red-700 hover:bg-red-100"
                                        >
                                          Xóa
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Đáp án đúng</label>
                                    <input
                                      value={question.correctAnswer}
                                      onChange={(e) => updateQuestion(index, (current) => ({ ...current, correctAnswer: e.target.value }))}
                                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                      placeholder="0, 1, 2, 3..."
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2 md:col-span-2">
                                  <label className="text-sm font-semibold text-gray-700">Từ khóa / đáp án mẫu</label>
                                  <textarea
                                    value={question.correctAnswer}
                                    onChange={(e) => updateQuestion(index, (current) => ({ ...current, correctAnswer: e.target.value }))}
                                    className="w-full min-h-24 rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                  />
                                </div>
                              )}

                              <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-semibold text-gray-700">Giải thích</label>
                                <textarea
                                  value={question.explanation ?? ""}
                                  onChange={(e) => updateQuestion(index, (current) => ({ ...current, explanation: e.target.value }))}
                                  className="w-full min-h-24 rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
  showAnswersAfterSubmit: boolean;
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
    showAnswersAfterSubmit: boolean;
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
