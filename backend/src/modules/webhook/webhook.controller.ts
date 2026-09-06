import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { JudgeResultDto } from './dto/judge-result.dto';
import { JudgeSecretGuard } from '../../common/guards/judge-secret.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

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
}
