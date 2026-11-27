import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { safeEqual } from '../config/secrets';

type Req = {
  ip?: string;
  headers?: Record<string, string | undefined>;
  body?: { email?: string; username?: string };
};

/**
 * Đếm giới hạn theo người dùng thay vì chỉ theo IP. Cả phòng máy dùng chung một IP
 * (NAT), nếu đếm theo IP thì 60 sinh viên nộp bài cùng lúc sẽ chặn lẫn nhau.
 *  - Có JWT hợp lệ (đã kiểm tra chữ ký HS256 và hạn dùng): đếm theo user id trong token.
 *  - Đăng nhập, quên mật khẩu (hoặc token giả mạo): đếm theo IP + tài khoản, chống dò mật khẩu
 *    một tài khoản mà không chặn cả lớp đăng nhập cùng lúc.
 *  - Còn lại: theo IP.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Req): Promise<string> {
    const ip = req.ip ?? 'unknown';
    const sub = UserThrottlerGuard.subjectFromAuthHeader(
      req.headers?.authorization,
    );
    if (sub) return Promise.resolve(`u:${sub}`);
    const account = (req.body?.email ?? req.body?.username)
      ?.toString()
      .toLowerCase()
      .trim();
    return Promise.resolve(account ? `ip:${ip}:acct:${account}` : `ip:${ip}`);
  }

  static subjectFromAuthHeader(
    header?: string,
    secret: string | undefined = process.env.JWT_SECRET?.trim(),
  ): string | null {
    if (!secret || secret.length < 16) return null;
    const token = header?.replace(/^Bearer\s+/i, '').trim();
    const parts = token?.split('.');
    if (!parts || parts.length !== 3) return null;
    const [headerPart, payloadPart, signaturePart] = parts;
    if (!headerPart || !payloadPart || !signaturePart) return null;

    try {
      const jwtHeader = JSON.parse(
        Buffer.from(headerPart, 'base64url').toString('utf8'),
      ) as { alg?: unknown };
      if (jwtHeader.alg !== 'HS256') return null;

      const expectedSig = createHmac('sha256', secret)
        .update(`${headerPart}.${payloadPart}`)
        .digest('base64url');
      if (!safeEqual(signaturePart, expectedSig)) return null;

      const json = JSON.parse(
        Buffer.from(payloadPart, 'base64url').toString('utf8'),
      ) as { sub?: unknown; exp?: unknown };
      if (typeof json.exp === 'number' && json.exp * 1000 <= Date.now()) {
        return null;
      }
      return typeof json.sub === 'string' && json.sub ? json.sub : null;
    } catch {
      return null;
    }
  }
}
