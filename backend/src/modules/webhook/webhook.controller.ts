import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { JudgeResultDto } from './dto/judge-result.dto';
import { JudgeProgressDto } from './dto/judge-progress.dto';
import { JudgeSecretGuard } from '../../common/guards/judge-secret.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { SandboxBatchService, type BatchResult } from '../sandbox/sandbox-batch.service';

@ApiTags('Webhook')
// Judge runner gửi tiến độ từng test liên tục; đã có JudgeSecretGuard nên không giới hạn.
@SkipThrottle()
@Controller('webhook')
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly sandboxBatch: SandboxBatchService,
  ) {}

  @Post('judge')
  @UseGuards(JudgeSecretGuard)
  @ApiOperation({ summary: 'Webhook nhận kết quả chấm bài từ Judge Server' })
  @ApiHeader({
    name: 'x-judge-secret',
    description: 'Secret key để xác thực Judge Server',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Đã xử lý kết quả thành công' })
  @ApiResponse({ status: 403, description: 'Sai Secret Key' })
  handleJudgeResult(@Body() judgeResultDto: JudgeResultDto) {
    return this.webhookService.processJudgeResult(judgeResultDto);
  }

  @Post('judge/progress')
  @UseGuards(JudgeSecretGuard)
  @ApiOperation({ summary: 'Webhook cập nhật tiến độ từng testcase' })
  @ApiHeader({
    name: 'x-judge-secret',
    description: 'Secret key để xác thực Judge Server',
    required: true,
  })
  handleJudgeProgress(@Body() progress: JudgeProgressDto) {
    return this.webhookService.processJudgeProgress(progress);
  }

  /**
   * Kết quả "chạy hàng loạt" (sinh test). Body có thể vài MB (input sinh ra + stdout) — giới hạn riêng
   * cho đường dẫn này được nới trong main.ts. Không dùng ValidationPipe vì body là dữ liệu máy chấm.
   */
  @Post('judge/batch')
  @UseGuards(JudgeSecretGuard)
  @ApiOperation({ summary: 'Webhook nhận kết quả chạy hàng loạt (sinh test)' })
  handleBatch(@Body() body: BatchResult & { batch_id?: string }) {
    if (!body?.batch_id) return { success: false };
    return { success: this.sandboxBatch.complete(body.batch_id, body) };
  }
}
