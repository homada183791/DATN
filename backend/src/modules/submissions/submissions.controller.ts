import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { RunCustomCodeDto } from './dto/run-custom-code.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Submissions')
@Controller('submissions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bài nộp' })
  @ApiQuery({ name: 'problem_id', required: false, description: 'Lọc bài nộp theo bài toán' })
  @ApiResponse({ status: 200, description: 'Danh sách bài nộp theo quyền người dùng.' })
  findAll(
    @Request() req: { user: { userId: string; role: Role } },
    @Query('problem_id') problemId?: string,
  ) {
    return this.submissionsService.findAll(req.user.userId, req.user.role, problemId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một bài nộp theo ID' })
  @ApiResponse({ status: 200, description: 'Chi tiết bài nộp' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài nộp' })
  findOne(
    @Param('id') id: string,
    @Request() req: { user: { userId: string; role: Role } },
  ) {
    return this.submissionsService.findOne(id, req.user.userId, req.user.role);
  }

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

  @Patch(':id/grade')
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Giảng viên chấm điểm thủ công và viết nhận xét bài nộp' })
  @ApiResponse({ status: 200, description: 'Chấm điểm và nhận xét thành công' })
  grade(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.submissionsService.gradeSubmission(id, req.user.userId, dto);
  }

  @Post(':id/rejudge')
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Giảng viên yêu cầu chấm lại một bài nộp cụ thể' })
  @ApiResponse({ status: 200, description: 'Đã đưa bài nộp vào hàng đợi để chấm lại' })
  rejudge(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.submissionsService.rejudgeSubmission(id, req.user.userId);
  }

  @Post('problem/:problemId/rejudge')
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Giảng viên yêu cầu chấm lại toàn bộ bài nộp của một bài toán' })
  @ApiResponse({ status: 200, description: 'Đã đưa tất cả bài nộp của bài toán vào hàng đợi để chấm lại' })
  rejudgeProblem(
    @Param('problemId') problemId: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.submissionsService.rejudgeProblem(problemId, req.user.userId);
  }
}
