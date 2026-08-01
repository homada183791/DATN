import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JudgeHub — Đăng nhập",
  description: "Hệ thống chấm bài lập trình trực tuyến",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}