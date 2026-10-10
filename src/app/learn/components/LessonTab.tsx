"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function LessonTab() {
  const [lessonUrl, setLessonUrl] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          const nextUrl = typeof data?.value === "string" && data.value.trim() ? data.value : process.env.NEXT_PUBLIC_LESSON_DOC_URL ?? "";
          setLessonUrl(nextUrl);
        }
      })
      .catch(() => {
        if (mounted) setLessonUrl(process.env.NEXT_PUBLIC_LESSON_DOC_URL ?? "");
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Transform Google Docs URL: /edit → /preview, Google Slides → /embed
  function getEmbedUrl(url: string): string {
    if (!url) return "";
    // Google Docs: replace /edit... with /preview
    if (url.includes("docs.google.com/document")) {
      return url.replace(/\/edit.*$/, "/preview");
    }
    // Google Slides: replace /edit... with /embed
    if (url.includes("docs.google.com/presentation")) {
      return url.replace(/\/edit.*$/, "/embed?start=false&loop=false&delayms=3000");
    }
    return url;
  }

  const embedUrl = getEmbedUrl(lessonUrl);

  function getDownloadUrl(url: string): string {
    if (!url) return "";
    if (url.includes("docs.google.com/document")) {
      return url.replace(/\/edit.*$/, "/export?format=pdf");
    }
    if (url.includes("docs.google.com/presentation")) {
      return url.replace(/\/edit.*$/, "/export/pdf");
    }
    return url;
  }

  const downloadUrl = getDownloadUrl(lessonUrl);

  if (!lessonUrl) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card p-8 text-center"
      >
        <span className="text-5xl block mb-4">📝</span>
        <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          Thầy/cô chưa gắn tài liệu
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Tài liệu bài học sẽ hiện ở đây khi thầy/cô cập nhật nhé!
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="card overflow-hidden w-full relative"
        style={{ height: "80vh", minHeight: "400px" }}
      >
        {/* Mobile: scale down a large container so the doc fits the screen */}
        <div className="block md:hidden w-[250%] h-[250%] origin-top-left scale-[0.4]">
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            title="Tài liệu bài học"
            allow="autoplay"
            allowFullScreen
          />
        </div>
        {/* Desktop: normal full width */}
        <div className="hidden md:block w-full h-full">
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            title="Tài liệu bài học"
            allow="autoplay"
            allowFullScreen
          />
        </div>
      </div>
      <div className="flex gap-2 justify-center">
        <a
          href={lessonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline btn-sm inline-flex"
        >
          Mở trong tab mới ↗
        </a>
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-sm inline-flex"
        >
          ⬇️ Tải tài liệu (PDF)
        </a>
      </div>
    </div>
  );
}
