import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { JudgeResultDto } from './dto/judge-result.dto';
import { JudgeSecretGuard } from '../../common/guards/judge-secret.guard';

@Controller('api/v1/webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('judge')
  @UseGuards(JudgeSecretGuard)
  handleJudgeResult(@Body() judgeResultDto: JudgeResultDto) {
    return this.webhookService.processJudgeResult(judgeResultDto);
  }
}
