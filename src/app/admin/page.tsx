"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import FlowDiagram from "@/components/FlowDiagram";
import { MODE_LABELS, STRUCTURE_LABELS } from "@/lib/config";

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
      <div className="min-h-screen flex items-center justify-center">
        <p>Đang kiểm tra...</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-6 max-w-sm w-full">
          <h1 className="text-xl font-bold mb-4 text-center">🔐 Quản trị</h1>
          <input
            type="password"
            className="input-field mb-3"
            placeholder="Mật khẩu admin"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          {authError && <p className="text-sm text-red-500 mb-2">{authError}</p>}
          <button onClick={handleLogin} className="btn btn-primary w-full">
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const [tab, setTab] = useState<"generate" | "pending" | "approved">("generate");

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-main)" }}>
      <header className="p-4 border-b" style={{ borderColor: "var(--border-light)", background: "white" }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">⚙️ Quản trị câu hỏi</h1>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        <div className="tab-bar">
          <button className={`tab-item ${tab === "generate" ? "active" : ""}`} onClick={() => setTab("generate")}>
            🤖 Sinh câu hỏi
          </button>
          <button className={`tab-item ${tab === "pending" ? "active" : ""}`} onClick={() => setTab("pending")}>
            📋 Chờ duyệt
          </button>
          <button className={`tab-item ${tab === "approved" ? "active" : ""}`} onClick={() => setTab("approved")}>
            ✅ Đã duyệt
          </button>
        </div>
        {tab === "generate" && <GenerateTab />}
        {tab === "pending" && <QuestionListTab status="pending" />}
        {tab === "approved" && <QuestionListTab status="approved" />}
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
    setModes(prev => prev.includes(k) ? prev.filter(m => m !== k) : [...prev, k]);
  };

  const toggleStructure = (k: string) => {
    setStructures(prev => prev.includes(k) ? prev.filter(s => s !== k) : [...prev, k]);
  };

  return (
    <div className="card p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Chế độ (chọn nhiều)</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(MODE_LABELS).map(([k, v]) => (
              <button
                key={k}
                onClick={() => toggleMode(k)}
                className={`badge cursor-pointer px-3 py-1 ${modes.includes(k) ? "badge-primary" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Cấu trúc (chọn nhiều)</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STRUCTURE_LABELS).map(([k, v]) => (
              <button
                key={k}
                onClick={() => toggleStructure(k)}
                className={`badge cursor-pointer px-3 py-1 ${structures.includes(k) ? "badge-warning" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Số lượng (1-5)</label>
        <input type="number" className="input-field" min={1} max={5} value={count} onChange={(e) => setCount(Number(e.target.value))} />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Chủ đề gợi ý (tuỳ chọn)</label>
        <input type="text" className="input-field" placeholder="Ví dụ: nấu ăn, dọn dẹp..." value={theme} onChange={(e) => setTheme(e.target.value)} />
      </div>
      <button onClick={handleGenerate} disabled={loading} className="btn btn-primary w-full">
        {loading ? "Đang sinh..." : "Sinh câu hỏi 🤖"}
      </button>

      {results.length > 0 && (
        <div className="space-y-2 mt-4">
          <h3 className="font-bold text-sm">Kết quả:</h3>
          {results.map((r, i) => (
            <div key={i} className="p-3 rounded-lg text-sm" style={{
              background: r.success ? "rgba(16,185,129,0.05)" : "rgba(239,68,68,0.05)",
              borderLeft: `3px solid ${r.success ? "var(--color-success)" : "var(--color-error)"}`,
            }}>
              <p className="font-medium">{r.success ? "✅" : "❌"} {r.title}</p>
              {r.errors && <p className="text-xs mt-1 opacity-70">{r.errors.join("; ")}</p>}
            </div>
          ))}
        </div>
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
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
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

  if (loading) return <div className="skeleton h-32 rounded-xl" />;

  if (questions.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="font-semibold">Không có câu hỏi nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="p-3 rounded-lg text-sm text-red-600" style={{ background: "rgba(239,68,68,0.05)" }}>
          ⚠️ {actionError}
        </div>
      )}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {questions.map((q: any) => (
        <motion.div key={q.id} layout className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">{q.data?.title ?? q.id}</p>
              <div className="flex gap-2 mt-1">
                <span className="badge badge-primary">{MODE_LABELS[q.mode] ?? q.mode}</span>
                <span className="badge badge-warning">{STRUCTURE_LABELS[q.type] ?? q.type}</span>
              </div>
            </div>
          </div>

          {/* Flowchart preview */}
          {q.data?.nodes && q.data?.edges && (
            <div className="p-2 rounded-lg" style={{ background: "rgba(0,0,0,0.02)" }}>
              <FlowDiagram
                nodes={q.data.nodes}
                edges={q.data.edges}
                blanks={q.data.blanks ?? []}
              />
            </div>
          )}

          {/* Edit mode */}
          {editingId === q.id ? (
            <div className="space-y-2">
              <textarea
                className="input-field font-mono text-xs"
                rows={12}
                value={editJson}
                onChange={(e) => setEditJson(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={() => handleSaveEdit(q.id)} className="btn btn-primary btn-sm">💾 Lưu</button>
                <button onClick={() => setEditingId(null)} className="btn btn-ghost btn-sm">Hủy</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {status === "pending" && (
                <>
                  <button onClick={() => handleAction(q.id, "approve")} className="btn btn-primary btn-sm">✅ Duyệt</button>
                  <button onClick={() => handleAction(q.id, "delete")} className="btn btn-ghost btn-sm text-red-500">🗑 Xóa</button>
                </>
              )}
              {status === "approved" && (
                <>
                  <button onClick={() => handleAction(q.id, "unpublish")} className="btn btn-outline btn-sm">⏪ Gỡ duyệt</button>
                  <button onClick={() => handleAction(q.id, "delete")} className="btn btn-ghost btn-sm text-red-500">🗑 Xóa</button>
                </>
              )}
              <button
                onClick={() => { setEditingId(q.id); setEditJson(JSON.stringify(q.data, null, 2)); setActionError(""); }}
                className="btn btn-outline btn-sm"
              >
                ✏️ Sửa JSON
              </button>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
