import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';

@ApiTags('Plagiarism')
@Controller('contests/:id/plagiarism-reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PlagiarismController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách báo cáo đạo văn của một kỳ thi' })
  @ApiResponse({ status: 200, description: 'Danh sách các cặp bài nộp có dấu hiệu đạo văn.' })
  async getReports(@Param('id') contestId: string) {
    return this.prisma.plagiarismReport.findMany({
      where: { contest_id: contestId },
      include: {
        problem: { select: { title: true } },
        submission_1: {
          select: { user: { select: { email: true } }, created_at: true }
        },
        submission_2: {
          select: { user: { select: { email: true } }, created_at: true }
        }
      },
      orderBy: { similarity_score: 'desc' }
    });
  }
}
