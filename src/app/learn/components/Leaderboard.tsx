"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface LeaderboardEntry {
  name: string;
  class: string;
  total: number;
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [scope, setScope] = useState<"all" | "class">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const res = await fetch(`/api/leaderboard?scope=${scope}`);
        const data = await res.json();
        if (!cancelled) setEntries(data.leaderboard ?? []);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchLeaderboard();
    return () => { cancelled = true; };
  }, [scope]);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-4">
      {/* Scope tabs */}
      <div className="tab-bar">
        <button
          className={`tab-item ${scope === "all" ? "active" : ""}`}
          onClick={() => setScope("all")}
        >
          🌍 Toàn bộ
        </button>
        <button
          className={`tab-item ${scope === "class" ? "active" : ""}`}
          onClick={() => setScope("class")}
        >
          🏫 Lớp của em
        </button>
      </div>

      {/* Refresh button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            setLoading(true);
            fetch(`/api/leaderboard?scope=${scope}`)
              .then(r => r.json())
              .then(d => setEntries(d.leaderboard ?? []))
              .catch(() => {})
              .finally(() => setLoading(false));
          }}
          className="btn btn-ghost btn-sm"
          disabled={loading}
        >
          🔄 Làm mới
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-12 rounded-lg" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-8 text-center">
          <span className="text-4xl block mb-3">🏆</span>
          <p className="font-semibold">Chưa có ai trên bảng xếp hạng</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Hãy là người đầu tiên ghi điểm nhé!
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(124,58,237,0.05)" }}>
                <th className="text-left px-4 py-3 font-semibold w-12">#</th>
                <th className="text-left px-4 py-3 font-semibold">Họ tên</th>
                <th className="text-left px-4 py-3 font-semibold">Lớp</th>
                <th className="text-right px-4 py-3 font-semibold">Điểm</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => {
                const rank = i + 1;
                return (
                  <motion.tr
                    key={`${entry.name}-${entry.class}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-t"
                    style={{
                      borderColor: "var(--border-light)",
                      background: rank <= 3 ? "rgba(124,58,237,0.02)" : undefined,
                    }}
                  >
                    <td className="px-4 py-3 font-bold">
                      {rank <= 3 ? medals[rank - 1] : rank}
                    </td>
                    <td className="px-4 py-3 font-medium truncate max-w-[150px]">
                      {entry.name}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                      {entry.class}
                    </td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: "var(--color-accent)" }}>
                      ⭐ {entry.total}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
