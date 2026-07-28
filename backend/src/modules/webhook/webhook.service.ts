import { Injectable, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JudgeResultDto } from './dto/judge-result.dto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processJudgeResult(judgeResultDto: JudgeResultDto) {
    const { submission_id, status, execution_time, memory_used } = judgeResultDto;

    try {
      const submission = await this.prisma.submission.findUnique({
        where: { id: submission_id },
      });

      if (!submission) {
        throw new NotFoundException('Không tìm thấy bài nộp với mã cung cấp.');
      }

      await this.prisma.submission.update({
        where: { id: submission_id },
        data: {
          status,
          execution_time,
          memory_used,
        },
      });

      this.logger.log(`[Judge Webhook] Submission ${submission_id} updated to ${status}`);

      return { success: true };
    } catch (error) {
     
      if (error instanceof NotFoundException) { // Bỏ qua nếu lỗi đã được ném ra từ trước (NotFoundException)
        throw error;
      }
      
      // Log lỗi để debug
      this.logger.error(`[Judge Webhook] Error updating submission ${submission_id}: ${error.message}`, error.stack);
      
      
      throw new InternalServerErrorException('Đã xảy ra lỗi khi cập nhật kết quả chấm bài.');// Exception chung cho hệ thống
    }
  }
}