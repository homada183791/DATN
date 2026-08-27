import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JudgeResultDto } from './dto/judge-result.dto';
import { EventsGateway } from '../../events/events.gateway';
import { UsersService } from '../users/users.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly usersService: UsersService,
  ) {}

  async processJudgeResult(judgeResultDto: JudgeResultDto) {
    const { is_custom, session_id, submission_id, status, execution_time, memory_used, stdout, stderr, test_results } = judgeResultDto;

    // =============================================
    // LUỒNG CUSTOM RUN: Không chạm DB, bắn thẳng Socket
    // =============================================
    if (is_custom === true) {
      if (!session_id) {
        throw new NotFoundException('Thiếu mã phiên (session_id) cho Custom Run.');
      }

      this.logger.log(`[Webhook] Custom Run result for session=${session_id}, status=${status}`);

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

    const submission = await this.prisma.submission.findUnique({
      where: { id: submission_id },
      include: {
        problem: {
          include: {
            contests: true
          }
        }
      }
    });

    if (!submission) {
      throw new NotFoundException('Không tìm thấy bài nộp với mã cung cấp.');
    }

    // Dùng transaction để vừa cập nhật submission, vừa tạo test results
    const updatedSubmission = await this.prisma.$transaction(async (tx) => {
      let score = 0;

      if (test_results && test_results.length > 0) {
        // Tính điểm: (số testcase ACCEPTED / tổng số) * 100
        const acceptedCount = test_results.filter(t => t.status === 'ACCEPTED').length;
        score = (acceptedCount / test_results.length) * 100;

        // Lưu danh sách test_results vào CSDL
        await tx.submissionTestResult.createMany({
          data: test_results.map(t => ({
            submission_id: submission_id as string,
            testcase_index: t.testcase_index,
            status: t.status,
            execution_time: t.execution_time,
            memory_used: t.memory_used,
          }))
        });
      }

      return tx.submission.update({
        where: { id: submission_id },
        data: {
          status,
          execution_time,
          memory_used,
          score,
        },
      });
    });

    this.logger.log(`[Judge Webhook] Submission ${submission_id} updated to ${status} with score ${updatedSubmission.score}`);

    // Cập nhật Streak nếu bài được ACCEPTED (fire-and-forget, không block luồng chính)
    if (status === 'ACCEPTED') {
      this.usersService.updateUserStreak(submission.user_id);
    }

    // Bắn sự kiện realtime xuống Frontend qua Socket.io
    this.eventsGateway.emitSubmissionUpdate(submission_id as string, {
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
        for (const cp of submission.problem.contests) {
          this.eventsGateway.emitAdminDashboardUpdate(cp.contest_id, adminPayload);
        }
      }
    } catch (e) {
      this.logger.error(`[Judge Webhook] Failed to emit admin update: ${e.message}`);
    }

    return { success: true };
  }
}
