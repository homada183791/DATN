import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/auth-context";

export const metadata: Metadata = {
  title: "JudgeHub",
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
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}