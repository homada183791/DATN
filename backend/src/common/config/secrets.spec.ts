import { createHmac } from 'node:crypto';
import { isAllowedOrigin, requireSecret, safeEqual } from './secrets';
import { UserThrottlerGuard } from '../guards/user-throttler.guard';
import { QueueService } from '../../modules/queue/queue.service';

describe('secrets', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it('throws when a secret is missing or too short instead of using a default', () => {
    delete process.env.JWT_SECRET;
    expect(() => requireSecret('JWT_SECRET')).toThrow(/JWT_SECRET/);
    process.env.JWT_SECRET = 'short';
    expect(() => requireSecret('JWT_SECRET')).toThrow(/16/);
    process.env.JWT_SECRET = 'a-long-enough-secret-value';
    expect(requireSecret('JWT_SECRET')).toBe('a-long-enough-secret-value');
  });

  it('compares secrets safely', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abd', 'abc')).toBe(false);
    expect(safeEqual('ab', 'abc')).toBe(false);
    expect(safeEqual(undefined, 'abc')).toBe(false);
  });

  it('allows configured origins and localhost only outside production', () => {
    process.env.CORS_ORIGIN = 'https://judgehub.example.edu';
    process.env.NODE_ENV = 'development';
    expect(isAllowedOrigin('https://judgehub.example.edu')).toBe(true);
    expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
    expect(isAllowedOrigin('https://evil.example.com')).toBe(false);
    process.env.NODE_ENV = 'production';
    expect(isAllowedOrigin('http://localhost:5173')).toBe(false);
  });
});

describe('UserThrottlerGuard tracker', () => {
  const secret = 'test-jwt-secret-at-least-16-chars';
  const signToken = (payload: Record<string, unknown>, key = secret) => {
    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', key)
      .update(`${header}.${body}`)
      .digest('base64url');
    return `${header}.${body}.${sig}`;
  };

  it('keys by user id only when JWT signature and expiration are valid', () => {
    const valid = signToken({
      sub: 'u-1',
      exp: Math.floor(Date.now() / 1000) + 300,
    });
    const forged = `x.${Buffer.from(JSON.stringify({ sub: 'u-1' })).toString('base64url')}.y`;
    const wrongKey = signToken({ sub: 'u-1' }, 'wrong-secret-key-16-chars');
    const expired = signToken({
      sub: 'u-1',
      exp: Math.floor(Date.now() / 1000) - 10,
    });

    expect(
      UserThrottlerGuard.subjectFromAuthHeader(`Bearer ${valid}`, secret),
    ).toBe('u-1');
    expect(
      UserThrottlerGuard.subjectFromAuthHeader(`Bearer ${forged}`, secret),
    ).toBeNull();
    expect(
      UserThrottlerGuard.subjectFromAuthHeader(`Bearer ${wrongKey}`, secret),
    ).toBeNull();
    expect(
      UserThrottlerGuard.subjectFromAuthHeader(`Bearer ${expired}`, secret),
    ).toBeNull();
    expect(
      UserThrottlerGuard.subjectFromAuthHeader('Bearer not-a-jwt', secret),
    ).toBeNull();
    expect(
      UserThrottlerGuard.subjectFromAuthHeader(undefined, secret),
    ).toBeNull();
  });
});

describe('QueueService log summary', () => {
  it('never includes source code or test data', () => {
    const line = QueueService.describe({
      submission_id: 's1',
      language: 'CPP',
      source_code: 'SECRET_CODE',
      test_cases: [{ input: 'HIDDEN_INPUT', expected_output: 'HIDDEN_OUT' }],
    });
    expect(line).toBe('submission s1 lang=CPP tests=1');
    expect(line).not.toMatch(/SECRET_CODE|HIDDEN/);
  });
});
