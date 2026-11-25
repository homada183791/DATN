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
  const token = (sub: string) =>
    `x.${Buffer.from(JSON.stringify({ sub })).toString('base64url')}.y`;

  it('keys by user id when a JWT is present, so a shared lab IP is not throttled as one user', () => {
    expect(
      UserThrottlerGuard.subjectFromAuthHeader(`Bearer ${token('u-1')}`),
    ).toBe('u-1');
    expect(
      UserThrottlerGuard.subjectFromAuthHeader('Bearer not-a-jwt'),
    ).toBeNull();
    expect(UserThrottlerGuard.subjectFromAuthHeader(undefined)).toBeNull();
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
