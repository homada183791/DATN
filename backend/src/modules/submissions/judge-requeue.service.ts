import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';

/**
 * Gửi lại vào hàng đợi những bài nộp còn PENDING (lần publish trước thất bại,
 * ví dụ RabbitMQ tạm mất kết nối). Thay cho cơ chế chấm cục bộ không sandbox.
 */
@Injectable()
export class JudgeRequeueService {
  private readonly logger = new Logger(JudgeRequeueService.name);
  private running = false;

  /** Bài PENDING lâu hơn mốc này mới được gửi lại. */
  static readonly MIN_AGE_MS = 20_000;
  /** Quá mốc này thì thôi, tránh gửi lại mãi bài cũ. */
  static readonly MAX_AGE_MS = 30 * 60_000;
  static readonly BATCH = 20;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async requeueStuckSubmissions(now: Date = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      const stuck = await this.prisma.submission.findMany({
        where: {
          status: SubmissionStatus.PENDING,
          updated_at: {
            lt: new Date(now.getTime() - JudgeRequeueService.MIN_AGE_MS),
            gt: new Date(now.getTime() - JudgeRequeueService.MAX_AGE_MS),
          },
        },
        orderBy: { created_at: 'asc' },
        take: JudgeRequeueService.BATCH,
        include: { problem: { include: { test_cases: true } } },
      });

      let requeued = 0;
      for (const sub of stuck) {
        const ok = await this.queueService.publishJudgeJob({
          is_custom: false,
          submission_id: sub.id,
          problem_id: sub.problem_id,
          language: sub.language,
          language_version: sub.language_version || undefined,
          source_code: sub.source_code,
          time_limit: sub.problem.time_limit,
          memory_limit: sub.problem.memory_limit,
          test_cases: sub.problem.test_cases,
        });
        if (!ok) break; // Hàng đợi vẫn lỗi: dừng, lần chạy sau thử tiếp.
        await this.prisma.submission.updateMany({
          where: { id: sub.id, status: SubmissionStatus.PENDING },
          data: { status: SubmissionStatus.IN_QUEUE },
        });
        requeued++;
      }
      if (requeued > 0) {
        this.logger.log(
          `[Requeue] Re-published ${requeued} pending submission(s)`,
        );
      }
      return requeued;
    } finally {
      this.running = false;
    }
  }
}
