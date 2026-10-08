"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [cls, setCls] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), class: cls.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Đã có lỗi xảy ra");
        setLoading(false);
        return;
      }

      router.push("/learn");
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại");
      setLoading(false);
    }
  }

  const isDisabled = !name.trim() || !cls.trim() || loading;

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-8">
      {/* Decorative background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.08) 0%, transparent 60%), radial-gradient(ellipse at 50% 80%, rgba(249,115,22,0.05) 0%, transparent 60%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        {/* Logo / Mascot area */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
            style={{
              background:
                "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
              boxShadow: "var(--shadow-glow)",
            }}
          >
            <span className="text-4xl" role="img" aria-label="Robot Bit">
              🤖
            </span>
          </motion.div>
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: "var(--color-primary-dark)" }}
          >
            Tin học 6 – Bài 16
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Các cấu trúc điều khiển 🚀
          </p>
        </div>

        {/* Login Card */}
        <div className="card p-6">
          {/* Mascot greeting */}
          <div
            className="flex items-start gap-3 mb-5 p-3 rounded-xl"
            style={{ background: "rgba(124,58,237,0.05)" }}
          >
            <span className="text-2xl shrink-0">🤖</span>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--text-primary)" }}
            >
              Chào em! Mình là <strong>Bit</strong>. Nhập tên và lớp để bắt đầu
              học nhé! 📚
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold mb-1.5"
                style={{ color: "var(--text-primary)" }}
              >
                Họ và tên
              </label>
              <input
                id="name"
                type="text"
                className="input-field"
                placeholder="Nguyễn Văn A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                autoComplete="name"
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="class"
                className="block text-sm font-semibold mb-1.5"
                style={{ color: "var(--text-primary)" }}
              >
                Lớp
              </label>
              <input
                id="class"
                type="text"
                className="input-field"
                placeholder="6A1"
                value={cls}
                onChange={(e) => setCls(e.target.value)}
                maxLength={10}
                autoComplete="off"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm font-medium"
                style={{ color: "var(--color-error)" }}
              >
                ⚠️ {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isDisabled}
              className="btn btn-primary w-full text-lg"
              style={{ minHeight: "48px" }}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Đang vào...
                </span>
              ) : (
                "Vào học 🎓"
              )}
            </button>
          </form>
        </div>

        <p
          className="text-center text-xs mt-4"
          style={{ color: "var(--text-secondary)" }}
        >
          Sách Kết nối tri thức – Tin học 6
        </p>
      </motion.div>
    </div>
  );
}
