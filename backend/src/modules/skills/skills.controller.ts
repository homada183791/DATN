import { Body, Controller, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SkillsService } from './skills.service';
import { SetProblemSkillsDto } from './dto/set-problem-skills.dto';

type Req = { user: { userId: string; role?: string } };

@ApiTags('Skills')
@ApiBearerAuth()
@Controller('skills')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SkillsController {
  constructor(private readonly skills: SkillsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh mục kỹ năng chuẩn' })
  catalog() {
    return this.skills.listCatalog();
  }

  @Get('me')
  @ApiOperation({ summary: 'Bản đồ kỹ năng của tôi (scope=global hoặc id lớp)' })
  async mine(@Request() req: Req, @Query('scope') scope?: string) {
    const [mastery, classes] = await Promise.all([
      this.skills.getStudentMastery(req.user.userId, scope || 'global'),
      this.skills.getStudentClasses(req.user.userId),
    ]);
    return { ...mastery, classes };
  }

  @Get('me/recommendations')
  @ApiOperation({ summary: 'Gợi ý bài nên làm tiếp theo kỹ năng còn yếu' })
  recommendations(@Request() req: Req) {
    return this.skills.getRecommendations(req.user.userId);
  }

  @Get('problem-map')
  @ApiOperation({ summary: 'Mã kỹ năng (đã duyệt) của mọi bài: { problemId: [codes] }' })
  problemMap() {
    return this.skills.getProblemSkillMap();
  }

  @Get('problems/:id')
  @ApiOperation({ summary: 'Nhãn kỹ năng của một bài' })
  problemSkills(@Param('id') id: string) {
    return this.skills.getProblemSkills(id);
  }

  @Post('problems/:id/suggest')
  @Roles(Role.INSTRUCTOR)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'AI đề xuất kỹ năng cho bài (chờ giảng viên duyệt)' })
  suggest(@Param('id') id: string) {
    return this.skills.suggestProblemSkills(id);
  }

  @Put('problems/:id')
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Giảng viên chốt nhãn kỹ năng của bài' })
  setSkills(@Param('id') id: string, @Body() body: SetProblemSkillsDto) {
    return this.skills.setProblemSkills(id, body.codes);
  }

  @Get('classes/:classId/heatmap')
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Bảng nhiệt kỹ năng của lớp + điểm thang 10' })
  heatmap(@Param('classId') classId: string, @Request() req: Req) {
    return this.skills.getClassHeatmap(classId, req.user.userId);
  }

  @Get('evaluation')
  @Roles(Role.INSTRUCTOR)
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @ApiOperation({ summary: 'Đánh giá mô hình trên lịch sử nộp bài (AUC, F1, Accuracy, đường cong học tập) — không ghi dữ liệu' })
  evaluation() {
    return this.skills.replayHistory(false);
  }

  @Post('recompute')
  @Roles(Role.INSTRUCTOR)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Tính lại toàn bộ điểm kỹ năng từ lịch sử (sau khi đổi nhãn)' })
  recompute() {
    return this.skills.replayHistory(true);
  }
}
