import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JudgeResultDto } from './dto/judge-result.dto';
import { EventsGateway } from '../../events/events.gateway';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async processJudgeResult(judgeResultDto: JudgeResultDto) {
    const { submission_id, status, execution_time, memory_used } = judgeResultDto;

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

    const updatedSubmission = await this.prisma.submission.update({
      where: { id: submission_id },
      data: {
        status,
        execution_time,
        memory_used,
      },
    });

    this.logger.log(`[Judge Webhook] Submission ${submission_id} updated to ${status}`);

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
          execution_time: updatedSubmission.execution_time,
          memory_used: updatedSubmission.memory_used,
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