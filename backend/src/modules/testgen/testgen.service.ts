import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiProvider } from '../ai/ai-provider';
import { SandboxBatchService, type BatchItem } from '../sandbox/sandbox-batch.service';
import {
  buildGeneratorPrompt,
  buildSolvePrompt,
  parseGenerators,
  parseSolveResponse,
  sameOutput,
  type AiSolution,
  type GeneratorKind,
  type GeneratorSpec,
} from './testgen-prompt';
import type { StartDraftTestGenDto, StartTestGenDto } from './dto/start-testgen.dto';

const MAX_INPUT_BYTES = 1_000_000;
const MAX_ACCEPTED = 30;
const PREVIEW = 400;
const SOLVE_ATTEMPTS = 3;
const BRUTE_TIME_MS = 3_000;
/** AI mode: lệch quá tỉ lệ này giữa 2 lời giải → coi như AI chưa hiểu đề, dừng. */
const MAX_MISMATCH_RATIO = 0.3;
/** Test lớn (chỉ lời giải nhanh chạy kịp) chỉ được giữ khi 2 lời giải đã khớp ít nhất ngần này test nhỏ. */
const MIN_AGREE_FOR_LARGE = 3;

type Mode = 'REFERENCE' | 'AI';
type VerifiedBy = 'reference' | 'both' | 'fast';
type Sample = { input: string; expected_output: string };

interface Spec {
  title: string;
  description: string;
  time_limit: number;
  memory_limit: number;
  samples: Sample[];
}

export interface Candidate {
  id: string;
  kind: GeneratorKind;
  generator: string;
  input: string;
  expected_output: string;
  input_bytes: number;
  reference_time_ms: number;
  /** Lời giải chạy gần sát giới hạn thời gian (>70%) — test nặng. */
  heavy: boolean;
  /** Output được kiểm chứng bằng gì: lời giải mẫu của GV / 2 lời giải AI khớp nhau / chỉ lời giải nhanh của AI. */
  verified_by: VerifiedBy;
  /** Bài AC cũ chạy sai trên test này */
  breaks: Array<{ submission_id: string; verdict: string }>;
}

export interface GeneratorReport extends GeneratorSpec {
  produced: number;
  error?: string;
}

interface Solutions {
  fast: AiSolution;
  brute: AiSolution;
  attempts: number;
  samples_checked: number;
  samples_source: 'instructor' | 'statement';
}

const norm = (s: string) => s.replace(/\r\n/g, '\n').trim();
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/**
 * Sinh test có kiểm chứng:
 *  0. Lời giải: dùng lời giải mẫu của giảng viên, hoặc (không có) AI viết 2 lời giải độc lập — nhanh (C++) và trâu (Python) —
 *     cả hai phải đúng ví dụ của đề.
 *  1. AI viết chương trình sinh input (ngẫu nhiên / biên / đối kháng) — không viết test trực tiếp.
 *  2. Chạy các generator trong sandbox (input = seed) để ra input thật.
 *  3. Lấy output: lời giải mẫu; hoặc 2 lời giải AI phải khớp nhau trên input nhỏ, input lớn chỉ giữ khi đã khớp đủ nhiều.
 *  4. (TrickCatcher, khi bài đã lưu) chạy test mới trên các bài AC cũ — bài nào giờ sai nghĩa là bộ test cũ đang yếu.
 */
@Injectable()
export class TestGenService {
  private readonly logger = new Logger(TestGenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiProvider,
    private readonly sandbox: SandboxBatchService,
  ) {}

  /** Sinh test cho bài đã có trong hệ thống (nút trong Ngân hàng bài tập). */
  async start(problemId: string, userId: string, dto: StartTestGenDto) {
    const problem = await this.prisma.problem.findUnique({ where: { id: problemId }, select: { id: true } });
    if (!problem) throw new NotFoundException('Không tìm thấy bài tập');
    const running = await this.prisma.testGenJob.findFirst({
      where: { problem_id: problemId, status: { notIn: ['DONE', 'FAILED'] } },
      select: { created_at: true },
    });
    // Một bài chỉ chạy một lượt một lúc; lượt treo quá 15 phút coi như đã chết (vd. backend khởi động lại).
    if (running && Date.now() - running.created_at.getTime() < 15 * 60_000) {
      throw new BadRequestException('Bài này đang có một lượt sinh test chạy dở.');
    }
    return this.createJob(userId, dto, problemId, null);
  }

  /** Sinh test ngay trong form tạo/sửa đề — bài có thể chưa lưu. */
  async startDraft(userId: string, dto: StartDraftTestGenDto) {
    const running = await this.prisma.testGenJob.count({
      where: {
        created_by: userId,
        status: { notIn: ['DONE', 'FAILED'] },
        created_at: { gt: new Date(Date.now() - 15 * 60_000) },
      },
    });
    if (running >= 2) throw new BadRequestException('Bạn đang có 2 lượt sinh test chạy dở, hãy chờ xong.');
    const spec: Spec = {
      title: dto.title,
      description: dto.description,
      time_limit: dto.time_limit,
      memory_limit: dto.memory_limit,
      samples: (dto.samples ?? []).filter((s) => s.input.trim() && s.expected_output.trim()),
    };
    return this.createJob(userId, dto, null, spec);
  }

  private async createJob(userId: string, dto: StartTestGenDto, problemId: string | null, spec: Spec | null) {
    if (!this.ai.isConfigured()) {
      throw new ServiceUnavailableException('Chưa cấu hình AI (AI_BASE_URL / AI_API_KEY).');
    }
    const code = dto.reference_code?.trim() ?? '';
    const mode: Mode = code ? 'REFERENCE' : 'AI';
    if (mode === 'REFERENCE') {
      if (!dto.reference_language) throw new BadRequestException('Thiếu ngôn ngữ của lời giải mẫu.');
      if (code.length < 10) throw new BadRequestException('Lời giải mẫu quá ngắn.');
    }
    const job = await this.prisma.testGenJob.create({
      data: {
        problem_id: problemId,
        created_by: userId,
        mode,
        reference_language: mode === 'REFERENCE' ? dto.reference_language : null,
        reference_code: mode === 'REFERENCE' ? dto.reference_code : null,
        spec: spec ? (spec as unknown as Prisma.InputJsonValue) : undefined,
        summary: {
          counts: {
            random: dto.random_count ?? 6,
            edge: dto.edge_count ?? 4,
            adversarial: dto.adversarial_count ?? 3,
          },
          reference_version: dto.reference_version ?? null,
        },
      },
    });
    void this.run(job.id).catch((err) => this.fail(job.id, err));
    return this.toView(job);
  }

  async get(jobId: string, userId?: string) {
    return this.toView(await this.findOwned(jobId, userId));
  }

  async latest(problemId: string) {
    const job = await this.prisma.testGenJob.findFirst({
      where: { problem_id: problemId },
      orderBy: { created_at: 'desc' },
    });
    return job ? this.toView(job) : null;
  }

  /** Thêm các test đã chọn vào bài đã lưu (test ẩn). */
  async apply(jobId: string, userId: string, candidateIds: string[]) {
    const job = await this.findOwned(jobId, userId, true);
    if (!job.problem_id) throw new BadRequestException('Bài chưa lưu: hãy thêm test vào form rồi lưu bài.');
    const chosen = this.pick(job, candidateIds);
    const existing = await this.prisma.testCase.findMany({
      where: { problem_id: job.problem_id },
      select: { input: true },
    });
    const seen = new Set(existing.map((t) => norm(t.input)));
    const fresh = chosen.filter((c) => !seen.has(norm(c.input)));
    if (fresh.length) {
      await this.prisma.testCase.createMany({
        data: fresh.map((c) => ({
          problem_id: job.problem_id!,
          input: c.input,
          expected_output: c.expected_output,
          is_hidden: true,
        })),
      });
    }
    await this.prisma.testGenJob.update({
      where: { id: jobId },
      data: { applied_count: { increment: fresh.length } },
    });
    return { added: fresh.length, skipped_duplicates: chosen.length - fresh.length };
  }

  /** Trả nguyên văn các test đã chọn để form tạo đề thêm vào danh sách test (lưu cùng bài). */
  async exportTests(jobId: string, userId: string, candidateIds: string[]) {
    const job = await this.findOwned(jobId, userId, true);
    const chosen = this.pick(job, candidateIds);
    await this.prisma.testGenJob.update({
      where: { id: jobId },
      data: { applied_count: { increment: chosen.length } },
    });
    return chosen.map((c) => ({ input: c.input, expected_output: c.expected_output, is_hidden: true }));
  }

  private async findOwned(jobId: string, userId?: string, requireOwner = false) {
    const job = await this.prisma.testGenJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Không tìm thấy lượt sinh test');
    // Lượt nháp (bài chưa lưu) và thao tác ghi chỉ người tạo được dùng
    if (userId && (requireOwner || !job.problem_id) && job.created_by !== userId) {
      throw new ForbiddenException('Chỉ người tạo lượt sinh test mới được dùng.');
    }
    return job;
  }

  private pick(job: { status: string; candidates: Prisma.JsonValue }, ids: string[]) {
    if (job.status !== 'DONE') throw new BadRequestException('Lượt sinh test chưa xong.');
    const want = new Set(ids);
    const chosen = ((job.candidates as unknown as Candidate[]) ?? []).filter((c) => want.has(c.id));
    if (chosen.length === 0) throw new BadRequestException('Chưa chọn test nào.');
    return chosen;
  }

  // ─── Quy trình ────────────────────────────────────────────────────────────

  private async loadSpec(job: { problem_id: string | null; spec: Prisma.JsonValue }) {
    if (!job.problem_id) {
      const spec = job.spec as unknown as Spec;
      return { spec, known: spec.samples, visible: spec.samples };
    }
    const p = await this.prisma.problem.findUniqueOrThrow({
      where: { id: job.problem_id },
      include: { test_cases: { select: { input: true, expected_output: true, is_hidden: true } } },
    });
    const visible = p.test_cases.filter((t) => !t.is_hidden);
    const spec: Spec = {
      title: p.title,
      description: p.description,
      time_limit: p.time_limit,
      memory_limit: p.memory_limit,
      samples: visible,
    };
    return { spec, known: p.test_cases as Sample[], visible: visible.length ? visible : p.test_cases.slice(0, 2) };
  }

  private async run(jobId: string) {
    const job = await this.prisma.testGenJob.findUniqueOrThrow({ where: { id: jobId } });
    const { spec, known, visible } = await this.loadSpec(job);
    const summary0 = (job.summary ?? {}) as { counts: Record<GeneratorKind, number>; reference_version?: string | null };
    const mode = job.mode as Mode;
    const tl = spec.time_limit;

    // Bước 0: có lời giải tin được.
    let main: { language: string; language_version?: string; code: string };
    let solutions: Solutions | null = null;
    if (mode === 'REFERENCE') {
      await this.setStatus(jobId, 'REFERENCE');
      main = {
        language: job.reference_language!,
        language_version: summary0.reference_version ?? undefined,
        code: job.reference_code!,
      };
      if (known.length) {
        const failed = await this.failingSample(main, known, tl * (job.problem_id ? 1 : 3), spec.memory_limit);
        if (failed) throw new Error(`Lời giải mẫu không qua test hiện có ${failed}. Hãy kiểm tra lại lời giải trước khi sinh test.`);
      }
    } else {
      await this.setStatus(jobId, 'SOLVING');
      solutions = await this.solveWithAi(spec, visible, known);
      main = { language: solutions.fast.language, code: solutions.fast.code };
      await this.prisma.testGenJob.update({
        where: { id: jobId },
        data: { solutions: solutions as unknown as Prisma.InputJsonValue },
      });
    }

    // Bước 1: AI viết chương trình sinh input.
    await this.setStatus(jobId, 'GENERATORS');
    const prompt = buildGeneratorPrompt({
      title: spec.title,
      description: spec.description,
      samples: visible,
      referenceCode: main.code,
      referenceLanguage: main.language,
      counts: summary0.counts,
      timeLimitMs: tl,
      needSmall: mode === 'AI',
    });
    const res = await this.ai.complete({
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      maxTokens: 6000,
      temperature: 0.4,
      timeoutMs: 120_000,
    });
    const specs = this.fitCounts(parseGenerators(res.text), summary0.counts);
    if (specs.length === 0) throw new Error('AI không trả về chương trình sinh input hợp lệ.');
    await this.prisma.testGenJob.update({
      where: { id: jobId },
      data: { generators: specs.map((g) => ({ ...g, produced: 0 })) as unknown as Prisma.InputJsonValue },
    });

    // Bước 2: chạy generator trong sandbox, input = seed.
    await this.setStatus(jobId, 'INPUTS');
    const { reports, raw } = await this.runGenerators(specs, known);
    await this.prisma.testGenJob.update({
      where: { id: jobId },
      data: { generators: reports as unknown as Prisma.InputJsonValue },
    });
    if (raw.length === 0) throw new Error('Các chương trình sinh input đều lỗi hoặc không ra input mới.');

    // Bước 3: lấy output. Chạy với giới hạn gấp 3 để nhận ra test quá nặng thay vì bỏ ngay.
    await this.setStatus(jobId, 'REFERENCE');
    const inputs = raw.map((r) => r.input);
    const [fastOut, bruteOut] = await Promise.all([
      this.sandbox.run({
        language: main.language,
        language_version: main.language_version,
        source_code: main.code,
        inputs,
        time_limit_ms: tl * 3,
        memory_limit_mb: spec.memory_limit,
      }),
      solutions
        ? this.sandbox.run({
            language: solutions.brute.language,
            source_code: solutions.brute.code,
            inputs,
            time_limit_ms: Math.max(BRUTE_TIME_MS, tl),
            memory_limit_mb: Math.max(spec.memory_limit, 256),
          })
        : Promise.resolve(null),
    ]);
    if (fastOut.compile_error) throw new Error(`Lời giải lỗi biên dịch:\n${fastOut.compile_error}`);
    if (fastOut.error) throw new Error(fastOut.error);

    let dropped = 0;
    let agree = 0;
    let mismatch = 0;
    const pending: Candidate[] = []; // chỉ lời giải nhanh chạy kịp
    const candidates: Candidate[] = [];
    raw.forEach((r, i) => {
      const out = fastOut.results[i];
      // Lời giải lỗi hoặc vượt giới hạn: input có thể sai ràng buộc → bỏ.
      if (!out || out.status !== 'OK' || out.execution_time > tl) {
        dropped++;
        return;
      }
      const c: Candidate = {
        id: `t${i + 1}`,
        kind: r.kind,
        generator: r.generator,
        input: r.input,
        expected_output: out.stdout,
        input_bytes: Buffer.byteLength(r.input),
        reference_time_ms: out.execution_time,
        heavy: out.execution_time > tl * 0.7,
        verified_by: 'reference',
        breaks: [],
      };
      if (!solutions) return candidates.push(c);
      const b = bruteOut?.results[i];
      if (b && b.status === 'OK') {
        if (sameOutput(b.stdout, out.stdout)) {
          agree++;
          candidates.push({ ...c, verified_by: 'both' });
        } else {
          mismatch++;
        }
      } else {
        pending.push({ ...c, verified_by: 'fast' });
      }
    });
    let unverified = 0;
    if (solutions) {
      if (mismatch > 0 && mismatch / Math.max(agree + mismatch, 1) > MAX_MISMATCH_RATIO) {
        throw new Error(
          `Hai lời giải của AI cho kết quả khác nhau trên ${mismatch}/${agree + mismatch} test nhỏ — AI có thể chưa hiểu đúng đề. ` +
            'Hãy viết đề rõ hơn (ràng buộc, định dạng input/output) hoặc dán lời giải mẫu.',
        );
      }
      // Test lớn chỉ tin lời giải nhanh khi nó đã khớp lời giải trâu trên mọi test nhỏ (và đủ nhiều test).
      if (mismatch === 0 && agree >= MIN_AGREE_FOR_LARGE) candidates.push(...pending);
      else unverified = pending.length;
      candidates.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
    }
    if (candidates.length === 0) throw new Error('Không còn test nào đủ tin cậy sau khi kiểm chứng.');

    // Bước 4 (TrickCatcher): chạy test mới trên các bài AC cũ (chỉ khi bài đã lưu).
    let checked = 0;
    const broken = new Set<string>();
    if (job.problem_id) {
      await this.setStatus(jobId, 'CHECKING');
      ({ checked } = await this.checkAccepted(job.problem_id, candidates, tl, spec.memory_limit, broken));
    }

    const byKind = (k: GeneratorKind) => candidates.filter((c) => c.kind === k).length;
    await this.prisma.testGenJob.update({
      where: { id: jobId },
      data: {
        status: 'DONE',
        candidates: candidates as unknown as Prisma.InputJsonValue,
        summary: {
          ...summary0,
          mode,
          generated: raw.length,
          kept: candidates.length,
          dropped,
          agree,
          mismatch,
          unverified,
          by_kind: { random: byKind('random'), edge: byKind('edge'), adversarial: byKind('adversarial') },
          accepted_checked: checked,
          accepted_broken: broken.size,
          broken_submissions: [...broken],
          existing_tests: known.length,
          draft: !job.problem_id,
        } as Prisma.InputJsonValue,
      },
    });
  }

  /** AI viết lời giải nhanh + trâu; cả hai phải đúng ví dụ, sai thì gửi lại lỗi cho AI sửa (tối đa 3 lần). */
  private async solveWithAi(spec: Spec, visible: Sample[], known: Sample[]): Promise<Solutions> {
    let feedback: string | undefined;
    let lastError = 'AI không viết được lời giải.';
    for (let attempt = 1; attempt <= SOLVE_ATTEMPTS; attempt++) {
      const prompt = buildSolvePrompt({
        title: spec.title,
        description: spec.description,
        samples: visible,
        timeLimitMs: spec.time_limit,
        memoryLimitMb: spec.memory_limit,
        feedback,
      });
      const res = await this.ai.complete({
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        maxTokens: 6000,
        temperature: attempt === 1 ? 0.2 : 0.5,
        timeoutMs: 120_000,
      });
      const parsed = parseSolveResponse(res.text);
      if (!parsed.fast || !parsed.brute) {
        feedback = 'Your reply was not valid JSON with both "fast" and "brute" solutions.';
        lastError = 'AI không trả về đủ 2 lời giải.';
        continue;
      }
      const checks = known.length ? known : parsed.samples;
      const source = known.length ? 'instructor' : 'statement';
      if (checks.length === 0) {
        throw new Error(
          'Đề chưa có ví dụ input/output nào để kiểm tra lời giải của AI. Hãy thêm ít nhất 1 test mẫu (hoặc ghi ví dụ trong đề) rồi thử lại.',
        );
      }
      const fastFail = await this.failingSample(parsed.fast, checks, spec.time_limit * 3, spec.memory_limit, true);
      // Lời giải trâu được phép quá giờ trên test lớn, nhưng không được ra sai.
      const bruteFail = await this.failingSample(parsed.brute, checks, Math.max(BRUTE_TIME_MS, spec.time_limit), Math.max(spec.memory_limit, 256), true, true);
      if (!fastFail && !bruteFail) {
        return { fast: parsed.fast, brute: parsed.brute, attempts: attempt, samples_checked: checks.length, samples_source: source };
      }
      feedback = [fastFail && `fast solution: ${fastFail}`, bruteFail && `brute solution: ${bruteFail}`].filter(Boolean).join('\n');
      lastError = `Lời giải của AI chưa đúng ví dụ của đề sau ${attempt} lần thử:\n${feedback}`;
    }
    throw new Error(`${lastError}\nHãy viết đề rõ hơn hoặc dán lời giải mẫu.`);
  }

  /**
   * Chạy một lời giải trên các test đã biết. Trả null nếu qua hết, ngược lại mô tả test hỏng đầu tiên.
   * allowTle: lời giải trâu được phép quá giờ (test lớn), miễn là có ít nhất một test chạy xong và không test nào sai.
   */
  private async failingSample(
    sol: { language: string; language_version?: string; code: string },
    tests: Sample[],
    timeLimit: number,
    memory: number,
    detailed = false,
    allowTle = false,
  ): Promise<string | null> {
    const out = await this.sandbox.run({
      language: sol.language,
      language_version: sol.language_version,
      source_code: sol.code,
      inputs: tests.map((t) => t.input),
      time_limit_ms: timeLimit,
      memory_limit_mb: memory,
    });
    if (out.compile_error) return `compile error: ${clip(out.compile_error, 800)}`;
    if (out.error) throw new Error(out.error);
    let finished = 0;
    for (let i = 0; i < tests.length; i++) {
      const r = out.results[i];
      if (allowTle && r?.status === 'TIME_LIMIT_EXCEEDED') continue;
      if (!r || r.status !== 'OK') {
        return detailed
          ? `test #${i + 1}: ${r?.status ?? 'not run'} ${clip(r?.stderr ?? '', 300)}\ninput:\n${clip(tests[i].input, 300)}`
          : `#${i + 1} (${r?.status ?? 'không chạy'})`;
      }
      finished++;
      if (!sameOutput(r.stdout, tests[i].expected_output)) {
        return detailed
          ? `test #${i + 1}: wrong answer\ninput:\n${clip(tests[i].input, 300)}\nexpected:\n${clip(tests[i].expected_output, 200)}\ngot:\n${clip(r.stdout, 200)}`
          : `#${i + 1} (sai output)`;
      }
    }
    if (allowTle && finished === 0) return 'time limit exceeded on every example (even small ones)';
    return null;
  }

  private async runGenerators(specs: GeneratorSpec[], known: Sample[]) {
    const reports: GeneratorReport[] = [];
    const raw: Array<{ kind: GeneratorKind; generator: string; input: string }> = [];
    const seen = new Set(known.map((t) => norm(t.input)));
    for (const g of specs) {
      const out = await this.sandbox.run({
        language: 'PYTHON',
        source_code: g.code,
        inputs: Array.from({ length: g.count }, (_, i) => `${i + 1}\n`),
        time_limit_ms: 10_000,
        memory_limit_mb: 512,
      });
      const report: GeneratorReport = { ...g, produced: 0 };
      if (out.compile_error || out.error) {
        report.error = (out.compile_error || out.error || '').slice(0, 500);
      } else {
        const errs: string[] = [];
        out.results.forEach((r: BatchItem) => {
          if (r.status !== 'OK') return errs.push(`${r.status}: ${r.stderr.slice(0, 200)}`);
          const input = r.stdout.replace(/\r\n/g, '\n');
          const key = input.trim();
          if (!key) return errs.push('generator in ra rỗng');
          if (Buffer.byteLength(input) > MAX_INPUT_BYTES) return errs.push('input quá 1 MB');
          if (seen.has(key)) return;
          seen.add(key);
          raw.push({ kind: g.kind, generator: g.name, input: input.endsWith('\n') ? input : `${input}\n` });
          report.produced++;
        });
        if (errs.length && report.produced === 0) report.error = errs[0];
      }
      reports.push(report);
    }
    return { reports, raw };
  }

  private async checkAccepted(problemId: string, candidates: Candidate[], tl: number, memory: number, broken: Set<string>) {
    const accepted = await this.prisma.submission.findMany({
      where: { problem_id: problemId, status: 'ACCEPTED' },
      orderBy: { created_at: 'desc' },
      select: { id: true, user_id: true, language: true, language_version: true, source_code: true },
      take: 200,
    });
    // Mỗi sinh viên lấy bài AC mới nhất, bỏ code trùng.
    const picked: typeof accepted = [];
    const users = new Set<string>();
    const codes = new Set<string>();
    for (const s of accepted) {
      const key = s.source_code.replace(/\s+/g, '');
      if (users.has(s.user_id) || codes.has(key)) continue;
      users.add(s.user_id);
      codes.add(key);
      picked.push(s);
      if (picked.length >= MAX_ACCEPTED) break;
    }
    for (const s of picked) {
      const out = await this.sandbox.run({
        language: s.language,
        language_version: s.language_version ?? undefined,
        source_code: s.source_code,
        inputs: candidates.map((c) => c.input),
        time_limit_ms: tl,
        memory_limit_mb: memory,
      });
      if (out.compile_error || out.error) continue; // môi trường khác lúc nộp → không kết luận
      out.results.forEach((r, i) => {
        const verdict =
          r.status === 'OK' ? (sameOutput(r.stdout, candidates[i].expected_output) ? null : 'WRONG_ANSWER') : r.status;
        if (verdict) {
          candidates[i].breaks.push({ submission_id: s.id, verdict });
          broken.add(s.id);
        }
      });
    }
    return { checked: picked.length };
  }

  /** Chia lại số seed cho khớp số test giảng viên yêu cầu theo từng loại. */
  private fitCounts(specs: GeneratorSpec[], counts: Record<GeneratorKind, number>) {
    const out: GeneratorSpec[] = [];
    for (const kind of ['random', 'edge', 'adversarial'] as GeneratorKind[]) {
      const list = specs.filter((g) => g.kind === kind);
      const want = Math.max(0, counts[kind] ?? 0);
      if (!list.length || want === 0) continue;
      const base = Math.floor(want / list.length);
      list.forEach((g, i) => {
        const count = base + (i < want % list.length ? 1 : 0);
        if (count > 0) out.push({ ...g, count });
      });
    }
    return out;
  }

  private setStatus(jobId: string, status: string) {
    return this.prisma.testGenJob.update({ where: { id: jobId }, data: { status } });
  }

  private async fail(jobId: string, err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    this.logger.warn(`[TestGen] ${jobId} thất bại: ${message}`);
    await this.prisma.testGenJob
      .update({ where: { id: jobId }, data: { status: 'FAILED', error: message.slice(0, 4000) } })
      .catch(() => {});
  }

  /** Trả về cho giao diện: cắt bớt input/output dài, giữ kích thước thật. */
  private toView(job: {
    id: string;
    problem_id: string | null;
    mode: string;
    status: string;
    error: string | null;
    reference_language: string | null;
    solutions: Prisma.JsonValue;
    generators: Prisma.JsonValue;
    candidates: Prisma.JsonValue;
    summary: Prisma.JsonValue;
    applied_count: number;
    created_at: Date;
    updated_at: Date;
  }) {
    const cut = (s: string) => (s.length > PREVIEW ? `${s.slice(0, PREVIEW)}…` : s);
    const candidates = ((job.candidates as unknown as Candidate[]) ?? []).map((c) => ({
      ...c,
      input: cut(c.input),
      expected_output: cut(c.expected_output),
      output_bytes: Buffer.byteLength(c.expected_output),
    }));
    return {
      id: job.id,
      problem_id: job.problem_id,
      mode: job.mode,
      status: job.status,
      error: job.error,
      reference_language: job.reference_language,
      solutions: job.solutions ?? null,
      generators: job.generators ?? [],
      candidates,
      summary: job.summary ?? {},
      applied_count: job.applied_count,
      created_at: job.created_at,
      updated_at: job.updated_at,
    };
  }
}
