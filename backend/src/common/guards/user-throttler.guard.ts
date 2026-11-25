import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

type Req = {
  ip?: string;
  headers?: Record<string, string | undefined>;
  body?: { email?: string; username?: string };
};

/**
 * Đếm giới hạn theo người dùng thay vì chỉ theo IP. Cả phòng máy dùng chung một IP
 * (NAT), nếu đếm theo IP thì 60 sinh viên nộp bài cùng lúc sẽ chặn lẫn nhau.
 *  - Có JWT: đếm theo user id trong token (chỉ dùng làm khóa đếm, AuthGuard vẫn kiểm tra chữ ký).
 *  - Đăng nhập, quên mật khẩu: đếm theo IP + tài khoản, chống dò mật khẩu một tài khoản
 *    mà không chặn cả lớp đăng nhập cùng lúc.
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

  static subjectFromAuthHeader(header?: string): string | null {
    const token = header?.replace(/^Bearer\s+/i, '');
    const part = token?.split('.')[1];
    if (!part) return null;
    try {
      const json = JSON.parse(
        Buffer.from(part, 'base64url').toString('utf8'),
      ) as { sub?: unknown };
      return typeof json.sub === 'string' ? json.sub : null;
    } catch {
      return null;
    }
  }
}
