import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Cho phép frontend gọi "/api/..." nội bộ và tự động
  // forward sang backend, tránh lỗi CORS khi dev.
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },

  // Bật nếu cần build ra static export (không dùng SSR) — mặc định để tắt.
  // output: "export",

  images: {
    remotePatterns: [],
  },
};

export default nextConfig;