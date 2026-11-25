import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiProvider } from './ai-provider';
import {
  BLOCKED_REPLY,
  clip,
  containsSolutionCode,
  HintLevel,
  TutorContext,
  tutorSystemPrompt,
  wrapData,
} from './ai-guardrails';
import { explainTemplate, tutorTemplate } from './ai-templates';
import { TutorHintDto, HintType } from './dto/tutor-hint.dto';
import {
  GenerateTestCasesDto,
  TestCaseStrategy,
} from './dto/generate-testcases.dto';
import { ExplainErrorDto } from './dto/explain-error.dto';

const HINT_FOCUS: Record<HintType, string> = {
  [HintType.HINT]: 'Giúp sinh viên tìm ra vì sao code chưa đúng.',
  [HintType.COMPLEXITY]:
    'Tập trung vào độ phức tạp thời gian và bộ nhớ của code hiện tại so với giới hạn đề.',
  [HintType.EDGE_CASE]:
    'Tập trung vào các trường hợp biên code có thể đang bỏ sót.',
  [HintType.EXPLAIN_LOGIC]:
    'Giải thích hướng tiếp cận đúng cho bài, không viết code.',
};

const STATUS_VI: Record<string, string> = {
  ACCEPTED: 'Đúng (AC)',
  WRONG_ANSWER: 'Sai đáp án (WA)',
  TIME_LIMIT_EXCEEDED: 'Quá thời gian (TLE)',
  COMPILE_ERROR: 'Lỗi biên dịch (CE)',
  RUNTIME_ERROR: 'Lỗi khi chạy (RE)',
  PENDING: 'Đang chờ chấm',
  IN_QUEUE: 'Đang chấm',
};

type LlmOutcome = {
  text: string;
  source: 'llm' | 'template';
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  blocked: boolean;
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiProvider,
  ) {}

  private dailyQuota(): number {
    return Number(process.env.AI_DAILY_QUOTA) || 30;
  }

  // ─── Ngữ cảnh: thi / bài tập có điểm / luyện tập ────────────────────────────

  /** Đang có kỳ thi chứa bài này thì khóa AI, dù client có gửi contest_id hay không. */
  private async assertNotInRunningContest(
    problemId: string,
    contestId?: string,
  ) {
    const now = new Date();
    const running = await this.prisma.contest.findFirst({
      where: {
        start_time: { lte: now },
        end_time: { gte: now },
        OR: [
          ...(contestId ? [{ id: contestId }] : []),
          { problems: { some: { problem_id: problemId } } },
        ],
      },
      select: { id: true },
    });
    if (running) {
      throw new ForbiddenException(
        'Trợ lý AI bị khóa trong thời gian diễn ra kỳ thi nhằm đảm bảo công bằng.',
      );
    }
  }

  /** Bài nằm trong một bài tập còn hạn của lớp sinh viên đang học thì tính là có điểm. */
  async resolveContext(
    userId: string,
    problemId: string,
  ): Promise<TutorContext> {
    const homeworks = await this.prisma.homework.findMany({
      where: {
        deadline: { gte: new Date() },
        class: { students: { some: { student_id: userId } } },
      },
      select: { tasks: true },
    });
    const inHomework = homeworks.some((h) =>
      JSON.stringify(h.tasks ?? []).includes(problemId),
    );
    return inHomework ? 'homework' : 'practice';
  }

  /** Bài tập có điểm: chỉ được mở mức tiếp theo sau khi đã dùng mức trước. */
  private async allowedLevel(
    userId: string,
    problemId: string,
    context: TutorContext,
    requested?: number,
  ): Promise<{ level: HintLevel; maxLevel: HintLevel }> {
    if (context === 'practice') {
      const lvl = (requested ?? 3) as HintLevel;
      return { level: lvl, maxLevel: 3 };
    }
    const used = await this.prisma.aiInteraction.aggregate({
      where: { user_id: userId, problem_id: problemId, kind: 'TUTOR' },
      _max: { level: true },
    });
    const maxLevel = Math.min(3, (used._max.level ?? 0) + 1) as HintLevel;
    const level = Math.min(requested ?? maxLevel, maxLevel) as HintLevel;
    return { level, maxLevel };
  }

  private async assertQuota(userId: string): Promise<number> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const used = await this.prisma.aiInteraction.count({
      where: {
        user_id: userId,
        created_at: { gte: start },
        kind: { in: ['TUTOR', 'EXPLAIN'] },
      },
    });
    const remaining = this.dailyQuota() - used;
    if (remaining <= 0) {
      throw new HttpException(
        `Bạn đã dùng hết ${this.dailyQuota()} lượt hỏi AI hôm nay. Hạn mức được làm mới lúc 0 giờ.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return remaining;
  }

  // ─── Dữ liệu kết quả chấm gửi kèm cho AI ────────────────────────────────────

  /** Tóm tắt lần nộp: chỉ đưa nội dung test CÔNG KHAI, test ẩn chỉ báo là ẩn. */
  private async describeSubmission(submissionId: string) {
    const sub = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            description: true,
            difficulty: true,
            time_limit: true,
            memory_limit: true,
            test_cases: {
              select: { input: true, expected_output: true, is_hidden: true },
            },
          },
        },
        test_results: { orderBy: { testcase_index: 'asc' } },
      },
    });
    if (!sub) return null;
    const total = sub.test_results.length;
    const passed = sub.test_results.filter(
      (r) => r.status === 'ACCEPTED',
    ).length;
    const failed = sub.test_results.find((r) => r.status !== 'ACCEPTED');
    const lines = [
      `Kết quả chấm: ${STATUS_VI[sub.status] ?? sub.status}. Qua ${passed}/${total} test.`,
      `Giới hạn: ${sub.problem.time_limit} ms, ${sub.problem.memory_limit} MB.`,
    ];
    if (failed) {
      const tc = sub.problem.test_cases[failed.testcase_index];
      if (sub.status === 'COMPILE_ERROR') {
        lines.push(
          `Thông báo của trình biên dịch:\n${clip(failed.actual_output, 1500)}`,
        );
      } else if (tc && !tc.is_hidden) {
        lines.push(
          `Test đầu tiên bị sai: test ${failed.testcase_index + 1} (công khai).`,
          `Input:\n${clip(tc.input, 800)}`,
          `Output đúng:\n${clip(tc.expected_output, 400)}`,
          `Output của sinh viên:\n${clip(failed.actual_output, 400)}`,
        );
      } else {
        lines.push(
          `Test đầu tiên bị sai: test ${failed.testcase_index + 1} (test ẩn, không có nội dung).`,
        );
      }
    }
    return { sub, summary: lines.join('\n') };
  }

  // ─── Gọi AI có lớp chặn ─────────────────────────────────────────────────────

  private async askWithGuard(
    system: string,
    user: string,
    fallback: string,
  ): Promise<LlmOutcome> {
    if (!this.ai.isConfigured()) {
      return { text: fallback, source: 'template', blocked: false };
    }
    try {
      let res = await this.ai.complete({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        maxTokens: 700,
      });
      let blocked = false;
      if (containsSolutionCode(res.text)) {
        // Thử lại một lần với nhắc nhở cứng hơn, vẫn vi phạm thì thay bằng câu từ chối.
        res = await this.ai.complete({
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
            { role: 'assistant', content: res.text },
            {
              role: 'user',
              content:
                'Câu trả lời trên có code giải, vi phạm quy tắc. Viết lại CHỈ bằng lời, không có khối code.',
            },
          ],
          maxTokens: 700,
        });
        if (containsSolutionCode(res.text)) {
          blocked = true;
          res = { ...res, text: BLOCKED_REPLY };
        }
      }
      return {
        text: res.text.trim(),
        source: 'llm',
        model: res.model,
        inputTokens: res.inputTokens,
        outputTokens: res.outputTokens,
        latencyMs: res.latencyMs,
        blocked,
      };
    } catch (err) {
      this.logger.warn(
        `[AI] falling back to template: ${err instanceof Error ? err.message : err}`,
      );
      return { text: fallback, source: 'template', blocked: false };
    }
  }

  private async log(data: Prisma.AiInteractionUncheckedCreateInput) {
    try {
      const row = await this.prisma.aiInteraction.create({
        data,
        select: { id: true },
      });
      return row.id;
    } catch (err) {
      this.logger.warn(
        `[AI] could not log interaction: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  // ─── API ────────────────────────────────────────────────────────────────────

  async getTutorHint(dto: TutorHintDto, userId: string) {
    await this.assertNotInRunningContest(dto.problem_id, dto.contest_id);

    const problem = await this.prisma.problem.findUnique({
      where: { id: dto.problem_id },
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        time_limit: true,
        memory_limit: true,
      },
    });
    if (!problem) throw new NotFoundException('Không tìm thấy bài toán');

    const remaining = await this.assertQuota(userId);
    const context = await this.resolveContext(userId, problem.id);
    const { level, maxLevel } = await this.allowedLevel(
      userId,
      problem.id,
      context,
      dto.level,
    );
    const hintType = dto.hint_type ?? HintType.HINT;

    const latest = await this.prisma.submission.findFirst({
      where: { user_id: userId, problem_id: problem.id },
      orderBy: { created_at: 'desc' },
      select: { id: true },
    });
    const judged = latest ? await this.describeSubmission(latest.id) : null;

    const userPrompt = [
      `Bài: ${problem.title} (độ khó ${problem.difficulty}, ${problem.time_limit} ms, ${problem.memory_limit} MB).`,
      wrapData('DU_LIEU', `Đề bài:\n${clip(problem.description, 4000)}`),
      `Ngôn ngữ: ${dto.language}.`,
      wrapData('CODE_SINH_VIEN', clip(dto.current_code, 8000)),
      judged
        ? wrapData('DU_LIEU', `Lần nộp gần nhất:\n${judged.summary}`)
        : 'Sinh viên chưa nộp bài này.',
      `Yêu cầu: ${HINT_FOCUS[hintType]}`,
    ].join('\n\n');

    const out = await this.askWithGuard(
      tutorSystemPrompt(level, context),
      userPrompt,
      tutorTemplate(hintType, problem.title, problem.difficulty),
    );

    const interactionId = await this.log({
      user_id: userId,
      problem_id: problem.id,
      submission_id: latest?.id ?? null,
      kind: 'TUTOR',
      level,
      context,
      source: out.source,
      model: out.model ?? null,
      input_tokens: out.inputTokens ?? null,
      output_tokens: out.outputTokens ?? null,
      latency_ms: out.latencyMs ?? null,
      blocked_code: out.blocked,
    });

    return {
      success: true,
      interaction_id: interactionId,
      hint_type: hintType,
      level,
      max_level: maxLevel,
      next_level_available: level < 3,
      context,
      source: out.source,
      problem_id: problem.id,
      problem_title: problem.title,
      response: out.text,
      remaining_quota: Math.max(0, remaining - 1),
      created_at: new Date().toISOString(),
    };
  }

  async explainError(dto: ExplainErrorDto, userId: string, role?: string) {
    const judged = await this.describeSubmission(dto.submission_id);
    if (!judged) throw new NotFoundException('Không tìm thấy lượt nộp bài');
    const { sub, summary } = judged;
    const isInstructor = role === Role.INSTRUCTOR;
    if (!isInstructor && sub.user_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem bài nộp này.');
    }
    if (!isInstructor) await this.assertNotInRunningContest(sub.problem_id);

    const template = explainTemplate(
      sub.status,
      sub.execution_time,
      sub.memory_used,
    );
    if (
      sub.status === 'ACCEPTED' ||
      sub.status === 'PENDING' ||
      sub.status === 'IN_QUEUE'
    ) {
      return {
        success: true,
        submission_id: sub.id,
        status: sub.status,
        problem_title: sub.problem.title,
        analysis: template,
        source: 'template',
      };
    }

    const remaining = isInstructor ? Infinity : await this.assertQuota(userId);
    const context = isInstructor
      ? 'practice'
      : await this.resolveContext(userId, sub.problem_id);
    // Giải thích lỗi: luyện tập nói thẳng cách sửa (mức 3), bài tập có điểm chỉ chỗ sai (mức 2).
    const level: HintLevel = context === 'practice' ? 3 : 2;

    const out = await this.askWithGuard(
      tutorSystemPrompt(level, context),
      [
        `Bài: ${sub.problem.title}.`,
        wrapData('DU_LIEU', `Đề bài:\n${clip(sub.problem.description, 3000)}`),
        `Ngôn ngữ: ${sub.language}.`,
        wrapData('CODE_SINH_VIEN', clip(sub.source_code, 8000)),
        wrapData('DU_LIEU', summary),
        'Yêu cầu: Giải thích vì sao bài nộp này bị kết quả trên.',
      ].join('\n\n'),
      template,
    );

    const interactionId = await this.log({
      user_id: userId,
      problem_id: sub.problem_id,
      submission_id: sub.id,
      kind: 'EXPLAIN',
      level,
      context,
      source: out.source,
      model: out.model ?? null,
      input_tokens: out.inputTokens ?? null,
      output_tokens: out.outputTokens ?? null,
      latency_ms: out.latencyMs ?? null,
      blocked_code: out.blocked,
    });

    return {
      success: true,
      interaction_id: interactionId,
      submission_id: sub.id,
      status: sub.status,
      problem_title: sub.problem.title,
      level,
      context,
      source: out.source,
      analysis: out.text,
      remaining_quota: Number.isFinite(remaining)
        ? Math.max(0, remaining - 1)
        : null,
    };
  }

  async recordFeedback(userId: string, interactionId: string, value: number) {
    const res = await this.prisma.aiInteraction.updateMany({
      where: { id: interactionId, user_id: userId },
      data: { feedback: value },
    });
    if (res.count === 0)
      throw new NotFoundException('Không tìm thấy lượt hỏi AI');
    return { success: true };
  }

  /**
   * AI đề xuất test case cho giảng viên. Kết quả CHƯA được kiểm chứng bằng cách chạy
   * lời giải mẫu (verified: false): giảng viên cần xem lại trước khi lưu. Việc tự kiểm
   * chứng qua sandbox của judge-runner nằm trong đợt sau.
   */
  async generateTestCases(dto: GenerateTestCasesDto, userId?: string) {
    const count = Math.min(Math.max(dto.count || 5, 1), 20);
    let title = dto.title ?? 'Bài toán';
    let description = dto.description ?? '';
    if (dto.problem_id) {
      const p = await this.prisma.problem.findUnique({
        where: { id: dto.problem_id },
        select: { title: true, description: true },
      });
      if (p) {
        title = p.title;
        description = p.description;
      }
    }

    type Tc = {
      input: string;
      expected_output: string;
      is_hidden: boolean;
      explanation?: string;
      verified: boolean;
    };
    let tests: Tc[] = [];
    let source: 'llm' | 'template' = 'template';

    if (this.ai.isConfigured() && description.trim()) {
      try {
        const res = await this.ai.complete({
          messages: [
            {
              role: 'system',
              content:
                'Bạn sinh test case cho bài lập trình thi đấu. Chỉ trả về JSON hợp lệ dạng ' +
                '{"tests":[{"input":"...","expected_output":"...","explanation":"..."}]}, không thêm chữ nào khác. ' +
                'Ưu tiên trường hợp biên: nhỏ nhất, lớn nhất trong ràng buộc, giá trị trùng, giá trị âm nếu đề cho phép. ' +
                'Tuân thủ đúng ràng buộc của đề.',
            },
            {
              role: 'user',
              content: [
                `Tên bài: ${title}`,
                wrapData('DU_LIEU', clip(description, 6000)),
                dto.solution_code
                  ? wrapData(
                      'CODE_SINH_VIEN',
                      `Lời giải mẫu (${dto.language ?? '?'}):\n${clip(dto.solution_code, 6000)}`,
                    )
                  : '',
                `Sinh ${count} test.`,
              ].join('\n\n'),
            },
          ],
          maxTokens: 2500,
          temperature: 0.4,
        });
        const jsonText = res.text.slice(
          res.text.indexOf('{'),
          res.text.lastIndexOf('}') + 1,
        );
        const parsed = JSON.parse(jsonText) as {
          tests?: Array<{
            input?: unknown;
            expected_output?: unknown;
            explanation?: unknown;
          }>;
        };
        tests = (parsed.tests ?? [])
          .filter(
            (t) =>
              typeof t.input === 'string' &&
              typeof t.expected_output === 'string',
          )
          .slice(0, count)
          .map((t, i) => ({
            input: String(t.input),
            expected_output: String(t.expected_output),
            explanation:
              typeof t.explanation === 'string' ? t.explanation : undefined,
            is_hidden: i >= 2,
            verified: false,
          }));
        source = 'llm';
        if (userId) {
          await this.log({
            user_id: userId,
            problem_id: dto.problem_id ?? null,
            kind: 'TESTGEN',
            source,
            model: res.model,
            input_tokens: res.inputTokens ?? null,
            output_tokens: res.outputTokens ?? null,
            latency_ms: res.latencyMs,
          });
        }
      } catch (err) {
        this.logger.warn(
          `[AI] testgen fallback: ${err instanceof Error ? err.message : err}`,
        );
        tests = [];
      }
    }

    if (tests.length === 0) {
      source = 'template';
      const base = [
        { in: '5\n1 2 3 4 5', out: '15', exp: 'Ví dụ cơ bản' },
        { in: '1\n10', out: '10', exp: 'Biên: N = 1' },
        { in: '6\n-2 3 -4 5 -1 2', out: '3', exp: 'Có số âm' },
        { in: '10\n0 0 0 0 0 0 0 0 0 0', out: '0', exp: 'Toàn số 0' },
        {
          in: '4\n100000 200000 300000 400000',
          out: '1000000',
          exp: 'Giá trị lớn',
        },
      ];
      tests = base.slice(0, count).map((b, i) => ({
        input: b.in,
        expected_output: b.out,
        explanation: `${b.exp} (mẫu chung, cần sửa theo đề)`,
        is_hidden: i >= 2,
        verified: false,
      }));
    }

    return {
      success: true,
      strategy:
        dto.strategy ||
        (dto.solution_code
          ? TestCaseStrategy.FROM_SOLUTION
          : TestCaseStrategy.FROM_DESCRIPTION),
      source,
      verified: false,
      note: 'Test do AI đề xuất, chưa chạy kiểm chứng với lời giải mẫu. Hãy kiểm tra lại output trước khi lưu.',
      count: tests.length,
      test_cases: tests,
    };
  }

  /** Xuất dữ liệu dạng ChatML (giữ như phiên bản cũ). */
  async exportTrainingData(limit = 100) {
    const submissions = await this.prisma.submission.findMany({
      where: { status: { in: ['ACCEPTED', 'WRONG_ANSWER'] } },
      take: Math.min(limit, 500),
      include: {
        problem: {
          select: { title: true, description: true, difficulty: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    const data = submissions.map((s) => ({
      messages: [
        {
          role: 'system',
          content:
            'You are an expert competitive programming AI evaluator and tutor.',
        },
        {
          role: 'user',
          content: `Problem: ${s.problem.title}\nDifficulty: ${s.problem.difficulty}\nStatement:\n${s.problem.description}\n\nStudent Solution (${s.language}):\n${s.source_code}`,
        },
        {
          role: 'assistant',
          content: `Evaluation Status: ${s.status}\nExecution Time: ${s.execution_time || 0}ms\nMemory Used: ${s.memory_used || 0}MB`,
        },
      ],
      metadata: {
        submission_id: s.id,
        problem_id: s.problem_id,
        language: s.language,
        status: s.status,
      },
    }));
    return { total_records: data.length, format: 'JSONL_CHATML', data };
  }

  /** Số liệu cho báo cáo đồ án: theo loại, nguồn, phản hồi, độ trễ. */
  async usageStats(days = 30) {
    const since = new Date(Date.now() - days * 86_400_000);
    const rows = await this.prisma.aiInteraction.groupBy({
      by: ['kind', 'source'],
      where: { created_at: { gte: since } },
      _count: { _all: true },
      _avg: { latency_ms: true, output_tokens: true },
    });
    const feedback = await this.prisma.aiInteraction.groupBy({
      by: ['feedback'],
      where: { created_at: { gte: since }, feedback: { not: null } },
      _count: { _all: true },
    });
    const blocked = await this.prisma.aiInteraction.count({
      where: { created_at: { gte: since }, blocked_code: true },
    });
    return {
      since: since.toISOString(),
      by_kind: rows,
      feedback,
      blocked_code: blocked,
    };
  }
}
