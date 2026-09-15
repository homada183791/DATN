import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JudgeResultDto } from './dto/judge-result.dto';
import { EventsGateway } from '../../events/events.gateway';
import { UsersService } from '../users/users.service';

type SubmissionWithContests = {
  id: string;
  user_id: string;
  problem_id: string;
  problem: {
    contests: Array<{ contest_id: string }>;
  } | null;
};

type SubmissionFindUniqueDelegate = {
  findUnique(args: {
    where: { id: string };
    include: { problem: { include: { contests: true } } };
  }): Promise<SubmissionWithContests | null>;
};

type UpdatedSubmission = {
  status: string;
  execution_time: number | null;
  memory_used: number | null;
  score: number;
  updated_at: Date;
};

type SubmissionTransactionClient = {
  submissionTestResult: {
    createMany(args: {
      data: Array<{
        submission_id: string;
        testcase_index: number;
        status: string;
        execution_time: number | null;
        memory_used: number | null;
      }>;
    }): Promise<{ count: number }>;
  };
  submission: {
    update(args: {
      where: { id: string };
      data: {
        status: string;
        execution_time: number | null;
        memory_used: number | null;
        score: number;
      };
    }): Promise<UpdatedSubmission>;
  };
};

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly usersService: UsersService,
  ) {}

  async processJudgeResult(judgeResultDto: JudgeResultDto) {
    const {
      is_custom,
      session_id,
      submission_id,
      execution_time,
      memory_used,
      stdout,
      stderr,
      test_results,
    } = judgeResultDto;
    const statusValue = (judgeResultDto as unknown as { status?: unknown })
      .status;
    const status = typeof statusValue === 'string' ? statusValue : 'UNKNOWN';

    // =============================================
    // LUỒNG CUSTOM RUN: Không chạm DB, bắn thẳng Socket
    // =============================================
    if (is_custom === true) {
      if (!session_id) {
        throw new NotFoundException(
          'Thiếu mã phiên (session_id) cho Custom Run.',
        );
      }

      this.logger.log(
        `[Webhook] Custom Run result for session=${session_id}, status=${status}`,
      );

      this.eventsGateway.emitCustomRunResult(session_id, {
        session_id,
        status,
        stdout: stdout ?? '',
        stderr: stderr ?? '',
        execution_time: execution_time ?? null,
        memory_used: memory_used ?? null,
      });

      return { success: true, message: 'Custom run result emitted' };
    }

    // =============================================
    // LUỒNG NỘP BÀI THẬT: Query & Update DB
    // =============================================
    if (!submission_id) {
      throw new NotFoundException('Thiếu mã bài nộp (submission_id).');
    }

    const submission = await (
      this.prisma.submission as unknown as SubmissionFindUniqueDelegate
    ).findUnique({
      where: { id: submission_id },
      include: {
        problem: {
          include: {
            contests: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Không tìm thấy bài nộp với mã cung cấp.');
    }

    // Dùng transaction để vừa cập nhật submission, vừa tạo test results
    const transaction = this.prisma.$transaction as unknown as <T>(
      callback: (tx: SubmissionTransactionClient) => Promise<T>,
    ) => Promise<T>;

    const updatedSubmission = await transaction(
      async (tx: SubmissionTransactionClient): Promise<UpdatedSubmission> => {
        let score = 0;

        if (test_results && test_results.length > 0) {
          // Tính điểm: (số testcase ACCEPTED / tổng số) * 100
          const acceptedCount = test_results.filter(
            (t) => t.status === 'ACCEPTED',
          ).length;
          score = (acceptedCount / test_results.length) * 100;

          // Lưu danh sách test_results vào CSDL
          await tx.submissionTestResult.createMany({
            data: test_results.map((t) => ({
              submission_id,
              testcase_index: t.testcase_index,
              status: t.status as string,
              execution_time: t.execution_time ?? null,
              memory_used: t.memory_used ?? null,
            })),
          });
        }

        return tx.submission.update({
          where: { id: submission_id },
          data: {
            status,
            execution_time: execution_time ?? null,
            memory_used: memory_used ?? null,
            score,
          },
        });
      },
    );

    this.logger.log(
      `[Judge Webhook] Submission ${submission_id} updated to ${status} with score ${updatedSubmission.score}`,
    );

    // Cập nhật Streak nếu bài được ACCEPTED (fire-and-forget, không block luồng chính)
    if (status === 'ACCEPTED') {
      this.usersService
        .updateUserStreak(submission.user_id)
        .catch((err: any) => {
          this.logger.error(
            `[Judge Webhook] Failed to update user streak: ${err.message}`,
          );
        });
    }

    // Bắn sự kiện realtime xuống Frontend qua Socket.io
    this.eventsGateway.emitSubmissionUpdate(submission_id, {
      submission_id,
      status: updatedSubmission.status,
      execution_time: updatedSubmission.execution_time,
      memory_used: updatedSubmission.memory_used,
      updated_at: updatedSubmission.updated_at,
    });

    // Bắn sự kiện realtime cho Giảng viên (Admin Dashboard) nếu bài tập thuộc kỳ thi
    try {
      if (submission.problem && submission.problem.contests.length > 0) {
        const adminPayload = {
          submission_id: submission.id,
          user_id: submission.user_id,
          problem_id: submission.problem_id,
          status: updatedSubmission.status,
          score: updatedSubmission.score,
          execution_time: updatedSubmission.execution_time,
          memory_used: updatedSubmission.memory_used,
          test_results: test_results || [],
        };
        for (const cp of submission.problem.contests as Array<{
          contest_id: string;
        }>) {
          this.eventsGateway.emitAdminDashboardUpdate(
            cp.contest_id,
            adminPayload,
          );
          // Emit leaderboard_updated so FE invalidates leaderboard cache
          this.eventsGateway.emitLeaderboardUpdate({
            contest_id: cp.contest_id,
            user_id: submission.user_id,
            status: updatedSubmission.status,
          });
        }
      }
    } catch (e: any) {
      this.logger.error(
        `[Judge Webhook] Failed to emit admin update: ${e.message}`,
      );
    }

    return { success: true };
  }
}
