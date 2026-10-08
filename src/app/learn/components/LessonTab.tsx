"use client";

import { motion } from "framer-motion";

export default function LessonTab() {
  const lessonUrl = process.env.NEXT_PUBLIC_LESSON_DOC_URL ?? "";

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
        className="card overflow-hidden"
        style={{ height: "80vh", minHeight: "400px" }}
      >
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          title="Tài liệu bài học"
          allow="autoplay"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
      <div className="text-center">
        <a
          href={lessonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline btn-sm inline-flex"
        >
          Mở trong tab mới ↗
        </a>
      </div>
    </div>
  );
}
