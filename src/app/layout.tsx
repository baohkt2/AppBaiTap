import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin", "vietnamese"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tin học 6 – Bài 16: Các cấu trúc điều khiển",
  description:
    "Web tự học Tin học lớp 6: luyện vẽ sơ đồ khối với cấu trúc tuần tự, rẽ nhánh và lặp",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${nunito.variable} h-full antialiased`}>
      <body
        className="min-h-full flex flex-col"
        style={{ fontFamily: "var(--font-nunito), sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
