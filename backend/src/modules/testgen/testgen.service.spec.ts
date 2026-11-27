import { execFileSync, spawnSync } from 'child_process';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TestGenService } from './testgen.service';
import { parseGenerators, parseSolveResponse, sameOutput } from './testgen-prompt';
import type { BatchRequest, BatchResult } from '../sandbox/sandbox-batch.service';

/**
 * Máy chấm giả chạy THẬT trên máy (python3 / g++) thay cho Docker, để kiểm tra trọn quy trình:
 * generator Python → input; lời giải mẫu C++ → output; bài AC cũ (tràn số int) → bị bắt.
 */
function localSandbox() {
  const calls: BatchRequest[] = [];
  const run = async (req: BatchRequest): Promise<BatchResult> => {
    calls.push(req);
    const dir = mkdtempSync(join(tmpdir(), 'tg-'));
    let cmd: string[];
    if (req.language === 'PYTHON') {
      writeFileSync(join(dir, 'main.py'), req.source_code);
      cmd = ['python3', join(dir, 'main.py')];
    } else {
      writeFileSync(join(dir, 'main.cpp'), req.source_code);
      try {
        execFileSync('g++', ['-O2', '-o', join(dir, 'a.out'), join(dir, 'main.cpp')], { stdio: 'pipe' });
      } catch (e: any) {
        return { compile_error: String(e.stderr), results: [] };
      }
      cmd = [join(dir, 'a.out')];
    }
    return {
      results: req.inputs.map((input) => {
        const t = Date.now();
        const r = spawnSync(cmd[0], cmd.slice(1), { input, timeout: req.time_limit_ms, maxBuffer: 1 << 24 });
        const ms = Date.now() - t;
        return {
          status: r.error ? 'TIME_LIMIT_EXCEEDED' : r.status !== 0 ? 'RUNTIME_ERROR' : 'OK',
          stdout: String(r.stdout ?? ''),
          stderr: String(r.stderr ?? ''),
          execution_time: ms,
        } as const;
      }),
    };
  };
  return { run, calls };
}

const REF = `#include <bits/stdc++.h>
int main(){int n;std::cin>>n;long long s=0;for(int i=0;i<n;i++){long long x;std::cin>>x;s+=x;}std::cout<<s<<"\\n";}`;
// Bài "AC" cũ nhưng sai: cộng bằng int → tràn số khi giá trị lớn. Bộ test cũ chỉ có số nhỏ nên vẫn AC.
const WEAK = `#include <bits/stdc++.h>
int main(){int n;std::cin>>n;int s=0;for(int i=0;i<n;i++){int x;std::cin>>x;s+=x;}std::cout<<s<<"\\n";}`;
const GOOD_PY = `n=int(input());print(sum(map(int,input().split())))`;

const LLM_REPLY = JSON.stringify({
  generators: [
    {
      kind: 'random', name: 'rand_small', description: 'Mảng ngẫu nhiên', count: 3,
      code: 'import random,sys\nrandom.seed(int(sys.stdin.read()))\nn=random.randint(1,50)\nprint(n)\nprint(*[random.randint(-1000,1000) for _ in range(n)])\n',
    },
    {
      kind: 'edge', name: 'n_one', description: 'N = 1', count: 2,
      code: 'import random,sys\nseed=int(sys.stdin.read())\nprint(1)\nprint([0,-10**9,10**9][seed%3])\n',
    },
    {
      kind: 'adversarial', name: 'overflow', description: 'Tổng vượt int 32-bit', count: 2,
      code: 'import random,sys\nrandom.seed(int(sys.stdin.read()))\nn=1000\nprint(n)\nprint(*[10**9-random.randint(0,5) for _ in range(n)])\n',
    },
    { kind: 'random', name: 'broken', description: 'thiếu', count: 1, code: 'x' },
  ],
});

function makePrisma() {
  const jobs = new Map<string, any>();
  const testCases: any[] = [];
  const prisma: any = {
    problem: {
      findUnique: jest.fn(async () => ({ id: 'p1' })),
      findUniqueOrThrow: jest.fn(async () => ({
        id: 'p1', title: 'Tổng dãy', description: 'Cho N (1≤N≤1000) và N số |a_i|≤1e9. In tổng.',
        time_limit: 2000, memory_limit: 256,
        test_cases: [
          { input: '3\n1 2 3\n', expected_output: '6\n', is_hidden: false },
          { input: '2\n-5 5\n', expected_output: '0\n', is_hidden: true },
        ],
      })),
    },
    testGenJob: {
      findFirst: jest.fn(async () => null),
      count: jest.fn(async () => 0),
      create: jest.fn(async ({ data }) => {
        const job = { id: 'job1', status: 'PENDING', mode: 'REFERENCE', spec: null, solutions: null, problem_id: null, error: null, generators: null, candidates: null,
          applied_count: 0, created_at: new Date(), updated_at: new Date(), ...data };
        jobs.set(job.id, job);
        return job;
      }),
      findUnique: jest.fn(async ({ where }) => jobs.get(where.id) ?? null),
      findUniqueOrThrow: jest.fn(async ({ where }) => jobs.get(where.id)),
      update: jest.fn(async ({ where, data }) => {
        const j = jobs.get(where.id);
        if (data.applied_count?.increment) data = { ...data, applied_count: j.applied_count + data.applied_count.increment };
        Object.assign(j, data);
        return j;
      }),
    },
    submission: {
      findMany: jest.fn(async () => [
        { id: 'sWeak', user_id: 'u1', language: 'CPP', language_version: null, source_code: WEAK },
        { id: 'sGood', user_id: 'u2', language: 'PYTHON', language_version: null, source_code: GOOD_PY },
        { id: 'sDup', user_id: 'u1', language: 'CPP', language_version: null, source_code: WEAK },
      ]),
    },
    testCase: {
      findMany: jest.fn(async () => testCases),
      createMany: jest.fn(async ({ data }) => { testCases.push(...data); return { count: data.length }; }),
    },
  };
  return { prisma, jobs, testCases };
}

const waitDone = async (jobs: Map<string, any>) => {
  for (let i = 0; i < 400; i++) {
    const s = jobs.get('job1')?.status;
    if (s === 'DONE' || s === 'FAILED') return;
    await new Promise((r) => setTimeout(r, 50));
  }
};

describe('TestGenService (quy trình 4 bước)', () => {
  it('sinh input bằng generator, lấy output từ lời giải mẫu, bắt bài AC cũ bị tràn số', async () => {
    const { prisma, jobs, testCases } = makePrisma();
    const sb = localSandbox();
    const ai: any = { isConfigured: () => true, complete: jest.fn(async () => ({ text: LLM_REPLY })) };
    const svc = new TestGenService(prisma, ai, sb as any);

    await svc.start('p1', 'gv1', { reference_language: 'CPP', reference_code: REF, random_count: 3, edge_count: 2, adversarial_count: 2 });
    await waitDone(jobs);
    const job = jobs.get('job1');
    expect(job.error).toBeNull();
    expect(job.status).toBe('DONE');

    // AI chỉ viết generator; generator hỏng bị bỏ
    expect(job.generators.map((g: any) => g.name)).toEqual(['rand_small', 'n_one', 'overflow']);
    // Bước 0: lời giải mẫu được kiểm tra trên 2 test cũ trước
    expect(sb.calls[0].inputs).toHaveLength(2);

    const c = job.candidates as any[];
    expect(c.length).toBe(7);
    // Output là output THẬT của lời giải mẫu
    const adv = c.filter((x) => x.kind === 'adversarial');
    const nums = adv[0].input.trim().split(/\s+/).slice(1).map(Number);
    expect(adv[0].expected_output.trim()).toBe(String(nums.reduce((a: number, b: number) => a + b, 0)));

    // Bước 4: bài int bị bắt trên test đối kháng, bài Python đúng thì không; bài trùng code bỏ qua
    expect(job.summary.accepted_checked).toBe(2);
    expect(job.summary.accepted_broken).toBe(1);
    expect(job.summary.broken_submissions).toEqual(['sWeak']);
    expect(adv.every((x) => x.breaks.some((b: any) => b.submission_id === 'sWeak'))).toBe(true);
    expect(c.filter((x) => x.kind === 'random').every((x) => x.breaks.length === 0)).toBe(true);

    // Thêm test đã chọn vào bài; chọn lại thì không thêm trùng
    await expect(svc.apply('job1', 'gv1', adv.map((x) => x.id))).resolves.toEqual({ added: 2, skipped_duplicates: 0 });
    expect(testCases).toHaveLength(2);
    expect(testCases[0].is_hidden).toBe(true);
    await expect(svc.apply('job1', 'gv1', [adv[0].id])).resolves.toEqual({ added: 0, skipped_duplicates: 1 });
    await expect(svc.apply('job1', 'gv2', [adv[0].id])).rejects.toThrow();
  }, 60_000);

  it('dừng nếu lời giải mẫu không qua bộ test hiện có', async () => {
    const { prisma, jobs } = makePrisma();
    const ai: any = { isConfigured: () => true, complete: jest.fn() };
    const svc = new TestGenService(prisma, ai, localSandbox() as any);
    await svc.start('p1', 'gv1', { reference_language: 'PYTHON', reference_code: 'print(42)  # sai hoàn toàn' });
    await waitDone(jobs);
    expect(jobs.get('job1').status).toBe('FAILED');
    expect(jobs.get('job1').error).toMatch(/không qua test hiện có #1/);
    expect(ai.complete).not.toHaveBeenCalled();
  }, 30_000);
});

// Lời giải nhanh viết sai (in thêm 1) ở lần đầu → AI được báo lỗi và sửa ở lần sau.
const SOLVE_BAD = JSON.stringify({
  samples: [{ input: '3\n1 2 3\n', output: '6\n' }],
  fast: { language: 'CPP', code: REF.replace('s<<', 's+1<<') },
  brute: { language: 'PYTHON', code: GOOD_PY },
});
// Lời giải trâu cố tình chậm khi N lớn → test lớn chỉ có lời giải nhanh chạy kịp.
const SLOW_BRUTE = 'import time\nn=int(input())\na=list(map(int,input().split()))\nif n>100: time.sleep(5)\nprint(sum(a))';
const SOLVE_OK = JSON.stringify({
  samples: [{ input: '3\n1 2 3\n', output: '6\n' }],
  fast: { language: 'CPP', code: REF },
  brute: { language: 'PYTHON', code: SLOW_BRUTE },
});

describe('TestGenService — chế độ AI (giảng viên không có lời giải mẫu, bài chưa lưu)', () => {
  it('AI viết 2 lời giải, sửa sau khi sai ví dụ, chấm chéo ra output; test lớn giữ khi đã khớp đủ', async () => {
    const { prisma, jobs } = makePrisma();
    const sb = localSandbox();
    const replies = [SOLVE_BAD, SOLVE_OK, LLM_REPLY];
    const ai: any = { isConfigured: () => true, complete: jest.fn(async () => ({ text: replies.shift() })) };
    const svc = new TestGenService(prisma, ai, sb as any);

    await svc.startDraft('gv1', {
      title: 'Tổng dãy',
      description: 'Cho N (1≤N≤1000) và N số nguyên |a_i|≤1e9. In tổng. Ví dụ: 3 / 1 2 3 → 6',
      time_limit: 2000,
      memory_limit: 256,
      samples: [],
      random_count: 3,
      edge_count: 2,
      adversarial_count: 2,
    });
    await waitDone(jobs);
    const job = jobs.get('job1');
    expect(job.error).toBeNull();
    expect(job.mode).toBe('AI');
    expect(job.solutions.attempts).toBe(2);
    expect(job.solutions.samples_source).toBe('statement');
    // lần 2 AI nhận được phản hồi lỗi của lần 1
    expect(ai.complete.mock.calls[1][0].messages[1].content).toMatch(/wrong answer/);

    const c = job.candidates as any[];
    expect(c.filter((x) => x.verified_by === 'both').length).toBeGreaterThanOrEqual(3);
    // test đối kháng N=1000: lời giải trâu quá giờ → chỉ lời giải nhanh, vẫn giữ vì đã khớp đủ
    const adv = c.filter((x) => x.kind === 'adversarial');
    expect(adv.length).toBe(2);
    expect(adv.every((x) => x.verified_by === 'fast')).toBe(true);
    expect(job.summary.mismatch).toBe(0);
    // bài chưa lưu: không soi bài AC cũ, không thêm thẳng vào DB, chỉ trả test cho form
    expect(prisma.submission.findMany).not.toHaveBeenCalled();
    await expect(svc.apply('job1', 'gv1', [c[0].id])).rejects.toThrow('Bài chưa lưu');
    const tests = await svc.exportTests('job1', 'gv1', [adv[0].id]);
    expect(tests[0].input.length).toBeGreaterThan(400); // nguyên văn, không bị cắt như bản xem trước
    await expect(svc.get('job1', 'gv2')).rejects.toThrow();
  }, 90_000);

  it('dừng và báo rõ khi đề không có ví dụ nào để kiểm lời giải', async () => {
    const { prisma, jobs } = makePrisma();
    const ai: any = {
      isConfigured: () => true,
      complete: jest.fn(async () => ({ text: JSON.stringify({ samples: [], fast: { language: 'CPP', code: REF }, brute: { language: 'PYTHON', code: GOOD_PY } }) })),
    };
    const svc = new TestGenService(prisma, ai, localSandbox() as any);
    await svc.startDraft('gv1', { title: 'Tổng dãy', description: 'Cho N số, in tổng của chúng nhé các bạn.', time_limit: 1000, memory_limit: 256 });
    await waitDone(jobs);
    expect(jobs.get('job1').status).toBe('FAILED');
    expect(jobs.get('job1').error).toMatch(/chưa có ví dụ/);
  }, 30_000);
});

describe('testgen-prompt', () => {
  it('đọc JSON generator, bỏ loại lạ / code rỗng, giới hạn count', () => {
    const g = parseGenerators('```json\n{"generators":[{"kind":"EDGE","name":"a","count":99,"code":"print(1)  # đủ hai mươi ký tự"},{"kind":"weird","code":"print(1)................"}]}\n```');
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ kind: 'edge', count: 8 });
    expect(parseGenerators('không có json')).toEqual([]);
  });
  it('đọc 2 lời giải + ví dụ trích từ đề', () => {
    const r = parseSolveResponse('{"samples":[{"input":"1","output":"2"},{"input":"x"}],"fast":{"language":"c++","code":"int main(){return 0;} // ok"},"brute":{"code":"print(2)"}}');
    expect(r.samples).toEqual([{ input: '1', expected_output: '2' }]);
    expect(r.fast?.language).toBe('CPP');
    expect(r.brute).toBeNull(); // code quá ngắn
  });
  it('so output như máy chấm', () => {
    expect(sameOutput('6\r\n', ' 6 ')).toBe(true);
    expect(sameOutput('6', '7')).toBe(false);
  });
});
