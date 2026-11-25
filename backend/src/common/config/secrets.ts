import { timingSafeEqual } from 'node:crypto';

/**
 * Đọc secret bắt buộc từ biến môi trường. Không có giá trị mặc định:
 * thiếu hoặc quá ngắn thì báo lỗi ngay để app không chạy với khóa đoán được.
 */
export function requireSecret(name: 'JWT_SECRET' | 'JUDGE_SECRET'): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `[Config] Thiếu biến môi trường ${name}. Thêm vào backend/.env trước khi chạy.`,
    );
  }
  if (value.length < 16) {
    throw new Error(`[Config] ${name} phải dài ít nhất 16 ký tự.`);
  }
  return value;
}

/** So sánh chuỗi bí mật với thời gian không đổi (chống dò theo thời gian phản hồi). */
export function safeEqual(a: string | undefined, b: string): boolean {
  if (typeof a !== 'string') return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Danh sách origin được phép (HTTP và WebSocket dùng chung). */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // công cụ không phải trình duyệt (curl, server-to-server)
  const allowed = (
    process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:5174'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (allowed.includes(origin)) return true;
  return (
    process.env.NODE_ENV !== 'production' &&
    /^http:\/\/localhost(:\d+)?$/.test(origin)
  );
}
