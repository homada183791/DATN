import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JudgeHub — Online Judge",
  description: "Hệ thống chấm bài lập trình trực tuyến",
  icons: {
    icon: "/logo-hcmus.png",
    shortcut: "/logo-hcmus.png",
    apple: "/logo-hcmus.png",
  },
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
