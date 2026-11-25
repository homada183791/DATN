import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AiService } from './ai.service';
import { TutorHintDto } from './dto/tutor-hint.dto';
import { GenerateTestCasesDto } from './dto/generate-testcases.dto';
import { ExplainErrorDto } from './dto/explain-error.dto';
import { AiFeedbackDto } from './dto/ai-feedback.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('AI Assistant')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(AuthGuard('jwt'))
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('tutor-hint')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'AI Tutor gợi ý cho sinh viên (bị khóa khi đang thi)' })
  getTutorHint(
    @Body() dto: TutorHintDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.aiService.getTutorHint(dto, req.user.userId);
  }

  @Post('generate-testcases')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({ summary: 'AI sinh bộ test cases cho giảng viên (từ đề hoặc từ code giải)' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  generateTestCases(
    @Body() dto: GenerateTestCasesDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.aiService.generateTestCases(dto, req.user.userId);
  }

  @Post('explain-error')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'AI phân tích lỗi bài nộp (Wrong Answer, TLE, CE)' })
  explainError(
    @Body() dto: ExplainErrorDto,
    @Request() req: { user: { userId: string; role?: string } },
  ) {
    return this.aiService.explainError(dto, req.user.userId, req.user.role);
  }

  @Post('feedback')
  @ApiOperation({ summary: 'Sinh viên đánh giá câu trả lời của AI (hữu ích / không)' })
  feedback(
    @Body() dto: AiFeedbackDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.aiService.recordFeedback(req.user.userId, dto.interaction_id, dto.value);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Thống kê sử dụng AI (số lượt, nguồn, phản hồi, độ trễ) cho báo cáo' })
  stats(@Query('days') days?: string) {
    return this.aiService.usageStats(days ? parseInt(days, 10) : 30);
  }

  @Get('training-data')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Xuất dataset phục vụ huấn luyện / fine-tune AI riêng' })
  exportTrainingData(@Query('limit') limit?: string) {
    return this.aiService.exportTrainingData(limit ? parseInt(limit, 10) : 100);
  }
}
