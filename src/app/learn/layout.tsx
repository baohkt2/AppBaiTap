"use client";

import { useEffect, useState, useCallback, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface Student {
  id: string;
  name: string;
  class: string;
  totalPoints: number;
}

interface StudentContextValue {
  student: Student | null;
  refreshStudent: () => Promise<void>;
}

const StudentContext = createContext<StudentContextValue>({
  student: null,
  refreshStudent: async () => {},
});

export function useStudent() {
  return useContext(StudentContext);
}

// Create a promise-based fetcher for initial load
function createStudentFetcher() {
  return fetch("/api/me").then((res) => res.json());
}

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const router = useRouter();

  const fetchStudent = useCallback(async () => {
    try {
      const data = await createStudentFetcher();
      if (!data.student) {
        router.push("/");
        return;
      }
      setStudent(data.student);
    } catch {
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Use a ref-based approach to avoid lint warning about setState in effect
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/me");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.student) {
          router.push("/");
          return;
        }
        setStudent(data.student);
      } catch {
        if (!cancelled) router.push("/");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full animate-pulse"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))" }}>
            <span className="text-3xl">🤖</span>
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Đang tải...
          </p>
        </div>
      </div>
    );
  }

  if (!student) return null;

  return (
    <StudentContext.Provider value={{ student, refreshStudent: fetchStudent }}>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header
          className="sticky top-0 z-50 text-white"
          style={{
            background: "var(--bg-header)",
            boxShadow: "0 4px 20px rgba(124,58,237,0.3)",
          }}
        >
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl shrink-0">🤖</span>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{student.name}</p>
                <p className="text-xs opacity-80">Lớp {student.class}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Points badge */}
              <motion.div
                key={student.totalPoints}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
                style={{
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <span>⭐</span>
                <span>{student.totalPoints}</span>
              </motion.div>

              {/* Logout */}
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Đăng xuất"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4">
          {children}
        </main>

        {/* Logout confirmation modal */}
        <AnimatePresence>
          {showLogoutConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.4)" }}
              onClick={() => setShowLogoutConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="card p-6 max-w-xs w-full text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-4xl block mb-3">👋</span>
                <h3 className="font-bold text-lg mb-2">Đăng xuất?</h3>
                <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                  Em có chắc muốn đăng xuất không?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="btn btn-outline flex-1"
                  >
                    Ở lại
                  </button>
                  <button
                    onClick={handleLogout}
                    className="btn btn-primary flex-1"
                  >
                    Đăng xuất
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StudentContext.Provider>
  );
}
