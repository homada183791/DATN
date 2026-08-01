import type { Metadata } from "next";
// @ts-ignore: CSS modules declaration missing in current project setup
import "./globals.css";

export const metadata: Metadata = {
  title: "JudgeHub — Online Judge",
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
