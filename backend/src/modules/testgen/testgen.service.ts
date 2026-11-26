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
  parseGenerators,
  sameOutput,
  type GeneratorKind,
  type GeneratorSpec,
} from './testgen-prompt';
import type { StartTestGenDto } from './dto/start-testgen.dto';

const MAX_INPUT_BYTES = 1_000_000;
const MAX_ACCEPTED = 30;
const PREVIEW = 400;

export interface Candidate {
  id: string;
  kind: GeneratorKind;
  generator: string;
  input: string;
  expected_output: string;
  input_bytes: number;
  reference_time_ms: number;
  /** Lời giải mẫu chạy gần sát giới hạn thời gian (>70%) — test nặng, nên xem lại giới hạn. */
  heavy: boolean;
  /** Bài AC cũ chạy sai trên test này: { submission_id, verdict } */
  breaks: Array<{ submission_id: string; verdict: string }>;
}

export interface GeneratorReport {
  kind: GeneratorKind;
  name: string;
  description: string;
  count: number;
  code: string;
  produced: number;
  error?: string;
}

/**
 * Sinh test có kiểm chứng, 4 bước:
 *  1. AI viết chương trình sinh input (ngẫu nhiên / biên / đối kháng) — không viết test trực tiếp.
 *  2. Chạy các generator trong sandbox (input = seed) để ra input thật.
 *  3. Chạy lời giải mẫu của giảng viên trong sandbox để ra output (sau khi kiểm tra nó qua bộ test hiện có).
 *  4. (TrickCatcher) Chạy test mới trên các bài AC cũ — bài nào giờ sai nghĩa là bộ test cũ đang yếu.
 */
@Injectable()
export class TestGenService {
  private readonly logger = new Logger(TestGenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiProvider,
    private readonly sandbox: SandboxBatchService,
  ) {}

  async start(problemId: string, userId: string, dto: StartTestGenDto) {
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true },
    });
    if (!problem) throw new NotFoundException('Không tìm thấy bài tập');
    if (!this.ai.isConfigured()) {
      throw new ServiceUnavailableException('Chưa cấu hình AI (AI_BASE_URL / AI_API_KEY).');
    }
    const running = await this.prisma.testGenJob.findFirst({
      where: { problem_id: problemId, status: { notIn: ['DONE', 'FAILED'] } },
      select: { id: true, created_at: true },
    });
    // Một bài chỉ chạy một lượt một lúc; lượt treo quá 15 phút coi như đã chết (vd. backend khởi động lại).
    if (running && Date.now() - running.created_at.getTime() < 15 * 60_000) {
      throw new BadRequestException('Bài này đang có một lượt sinh test chạy dở.');
    }
    const job = await this.prisma.testGenJob.create({
      data: {
        problem_id: problemId,
        created_by: userId,
        reference_language: dto.reference_language,
        reference_code: dto.reference_code,
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

  async get(jobId: string) {
    const job = await this.prisma.testGenJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Không tìm thấy lượt sinh test');
    return this.toView(job);
  }

  async latest(problemId: string) {
    const job = await this.prisma.testGenJob.findFirst({
      where: { problem_id: problemId },
      orderBy: { created_at: 'desc' },
    });
    return job ? this.toView(job) : null;
  }

  /** Thêm các test đã chọn vào bài (test ẩn). */
  async apply(jobId: string, userId: string, candidateIds: string[]) {
    const job = await this.prisma.testGenJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Không tìm thấy lượt sinh test');
    if (job.created_by !== userId) throw new ForbiddenException('Chỉ người tạo lượt sinh test mới được thêm test.');
    if (job.status !== 'DONE') throw new BadRequestException('Lượt sinh test chưa xong.');
    const pick = new Set(candidateIds);
    const chosen = ((job.candidates as unknown as Candidate[]) ?? []).filter((c) => pick.has(c.id));
    if (chosen.length === 0) throw new BadRequestException('Chưa chọn test nào.');

    const existing = await this.prisma.testCase.findMany({
      where: { problem_id: job.problem_id },
      select: { input: true },
    });
    const seen = new Set(existing.map((t) => t.input.replace(/\r\n/g, '\n').trim()));
    const fresh = chosen.filter((c) => !seen.has(c.input.replace(/\r\n/g, '\n').trim()));
    if (fresh.length) {
      await this.prisma.testCase.createMany({
        data: fresh.map((c) => ({
          problem_id: job.problem_id,
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

  // ─── Quy trình ────────────────────────────────────────────────────────────

  private async run(jobId: string) {
    const job = await this.prisma.testGenJob.findUniqueOrThrow({ where: { id: jobId } });
    const problem = await this.prisma.problem.findUniqueOrThrow({
      where: { id: job.problem_id },
      include: { test_cases: { select: { input: true, expected_output: true, is_hidden: true } } },
    });
    const summary0 = (job.summary ?? {}) as {
      counts: Record<GeneratorKind, number>;
      reference_version?: string | null;
    };
    const refVersion = summary0.reference_version ?? undefined;

    // Bước 0: lời giải mẫu phải qua bộ test hiện có, nếu không output sinh ra là vô nghĩa.
    await this.setStatus(jobId, 'REFERENCE');
    if (problem.test_cases.length) {
      const check = await this.sandbox.run({
        language: job.reference_language,
        language_version: refVersion,
        source_code: job.reference_code,
        inputs: problem.test_cases.map((t) => t.input),
        time_limit_ms: problem.time_limit,
        memory_limit_mb: problem.memory_limit,
      });
      if (check.compile_error) throw new Error(`Lời giải mẫu lỗi biên dịch:\n${check.compile_error}`);
      if (check.error) throw new Error(check.error);
      const failed = check.results.findIndex(
        (r, i) => r.status !== 'OK' || !sameOutput(r.stdout, problem.test_cases[i].expected_output),
      );
      if (failed >= 0) {
        const r = check.results[failed];
        throw new Error(
          `Lời giải mẫu không qua test hiện có #${failed + 1} (${r?.status === 'OK' ? 'sai output' : r?.status ?? 'không chạy'}). ` +
            'Hãy kiểm tra lại lời giải trước khi sinh test.',
        );
      }
    }

    // Bước 1: AI viết chương trình sinh input.
    await this.setStatus(jobId, 'GENERATORS');
    const samples = problem.test_cases.filter((t) => !t.is_hidden);
    const prompt = buildGeneratorPrompt({
      title: problem.title,
      description: problem.description,
      samples: samples.length ? samples : problem.test_cases.slice(0, 2),
      referenceCode: job.reference_code,
      referenceLanguage: job.reference_language,
      counts: summary0.counts,
      timeLimitMs: problem.time_limit,
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
    const reports: GeneratorReport[] = [];
    const raw: Array<{ kind: GeneratorKind; generator: string; input: string }> = [];
    const seen = new Set(problem.test_cases.map((t) => t.input.replace(/\r\n/g, '\n').trim()));
    for (const g of specs) {
      const seeds = Array.from({ length: g.count }, (_, i) => `${i + 1}\n`);
      const out = await this.sandbox.run({
        language: 'PYTHON',
        source_code: g.code,
        inputs: seeds,
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
    await this.prisma.testGenJob.update({
      where: { id: jobId },
      data: { generators: reports as unknown as Prisma.InputJsonValue },
    });
    if (raw.length === 0) throw new Error('Các chương trình sinh input đều lỗi hoặc không ra input mới.');

    // Bước 3: lời giải mẫu → output. Chạy với giới hạn gấp 3 để nhận ra test quá nặng thay vì bỏ ngay.
    await this.setStatus(jobId, 'REFERENCE');
    const ref = await this.sandbox.run({
      language: job.reference_language,
      language_version: refVersion,
      source_code: job.reference_code,
      inputs: raw.map((r) => r.input),
      time_limit_ms: problem.time_limit * 3,
      memory_limit_mb: problem.memory_limit,
    });
    if (ref.compile_error) throw new Error(`Lời giải mẫu lỗi biên dịch:\n${ref.compile_error}`);
    if (ref.error) throw new Error(ref.error);
    let dropped = 0;
    const candidates: Candidate[] = [];
    raw.forEach((r, i) => {
      const out = ref.results[i];
      // Lời giải mẫu lỗi hoặc vượt giới hạn: input có thể sai ràng buộc → bỏ.
      if (!out || out.status !== 'OK' || out.execution_time > problem.time_limit) {
        dropped++;
        return;
      }
      candidates.push({
        id: `t${i + 1}`,
        kind: r.kind,
        generator: r.generator,
        input: r.input,
        expected_output: out.stdout,
        input_bytes: Buffer.byteLength(r.input),
        reference_time_ms: out.execution_time,
        heavy: out.execution_time > problem.time_limit * 0.7,
        breaks: [],
      });
    });
    if (candidates.length === 0) throw new Error('Lời giải mẫu lỗi hoặc quá thời gian trên mọi input sinh ra.');

    // Bước 4 (TrickCatcher): chạy test mới trên các bài AC cũ.
    await this.setStatus(jobId, 'CHECKING');
    const accepted = await this.prisma.submission.findMany({
      where: { problem_id: problem.id, status: 'ACCEPTED' },
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
    const broken = new Set<string>();
    for (const s of picked) {
      const out = await this.sandbox.run({
        language: s.language,
        language_version: s.language_version ?? undefined,
        source_code: s.source_code,
        inputs: candidates.map((c) => c.input),
        time_limit_ms: problem.time_limit,
        memory_limit_mb: problem.memory_limit,
      });
      if (out.compile_error || out.error) continue; // môi trường khác lúc nộp → không kết luận
      out.results.forEach((r, i) => {
        const verdict =
          r.status === 'OK'
            ? sameOutput(r.stdout, candidates[i].expected_output)
              ? null
              : 'WRONG_ANSWER'
            : r.status;
        if (verdict) {
          candidates[i].breaks.push({ submission_id: s.id, verdict });
          broken.add(s.id);
        }
      });
    }

    const byKind = (k: GeneratorKind) => candidates.filter((c) => c.kind === k).length;
    await this.prisma.testGenJob.update({
      where: { id: jobId },
      data: {
        status: 'DONE',
        candidates: candidates as unknown as Prisma.InputJsonValue,
        summary: {
          ...summary0,
          generated: raw.length,
          kept: candidates.length,
          dropped,
          by_kind: { random: byKind('random'), edge: byKind('edge'), adversarial: byKind('adversarial') },
          accepted_checked: picked.length,
          accepted_broken: broken.size,
          broken_submissions: [...broken],
          existing_tests: problem.test_cases.length,
        } as Prisma.InputJsonValue,
      },
    });
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
    problem_id: string;
    status: string;
    error: string | null;
    reference_language: string;
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
      status: job.status,
      error: job.error,
      reference_language: job.reference_language,
      generators: job.generators ?? [],
      candidates,
      summary: job.summary ?? {},
      applied_count: job.applied_count,
      created_at: job.created_at,
      updated_at: job.updated_at,
    };
  }
}
