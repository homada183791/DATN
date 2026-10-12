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

@ApiTags('AI Assistant')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(AuthGuard('jwt'))
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('tutor-hint')
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
  generateTestCases(@Body() dto: GenerateTestCasesDto) {
    return this.aiService.generateTestCases(dto);
  }

  @Post('explain-error')
  @ApiOperation({ summary: 'AI phân tích lỗi bài nộp (Wrong Answer, TLE, CE)' })
  explainError(
    @Body() dto: ExplainErrorDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.aiService.explainError(dto, req.user.userId);
  }

  @Get('training-data')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Xuất dataset phục vụ huấn luyện / fine-tune AI riêng' })
  exportTrainingData(@Query('limit') limit?: string) {
    return this.aiService.exportTrainingData(limit ? parseInt(limit, 10) : 100);
  }
}
