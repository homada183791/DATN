import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { RunCustomCodeDto } from './dto/run-custom-code.dto';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Submissions')
@Controller('submissions')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @ApiOperation({ summary: 'Nộp bài lên hệ thống để chấm' })
  @ApiResponse({
    status: 201,
    description: 'Bài nộp đã được tiếp nhận và đang chờ chấm.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền hoặc đã bị cấm thi.',
  })
  create(
    @Request() req: { user: { userId: string } },
    @Body() createSubmissionDto: CreateSubmissionDto,
  ) {
    const userId = req.user.userId;
    return this.submissionsService.submitCode(userId, createSubmissionDto);
  }

  @Post('run-custom')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Chạy thử code với input tùy chọn (không lưu vào DB)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Job đã được đẩy vào hàng đợi, lắng nghe kết quả qua Socket.io với session_id trả về.',
  })
  @ApiResponse({
    status: 429,
    description: 'Gọp rất quá nhanh, vui lòng thử lại sau.',
  })
  runCustom(
    @Request() req: { user: { userId: string } },
    @Body() runCustomCodeDto: RunCustomCodeDto,
  ) {
    const userId = req.user.userId;
    return this.submissionsService.runCustomCode(userId, runCustomCodeDto);
  }
}
