import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TestGenService } from './testgen.service';
import { ApplyTestGenDto, StartTestGenDto } from './dto/start-testgen.dto';

type Req = { user: { userId: string } };

@ApiTags('TestGen')
@ApiBearerAuth()
@Controller('testgen')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.INSTRUCTOR)
export class TestGenController {
  constructor(private readonly testgen: TestGenService) {}

  @Post('problems/:problemId')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Bắt đầu sinh test có kiểm chứng (AI viết generator → sandbox → lời giải mẫu → soi bài AC cũ)' })
  start(@Param('problemId') problemId: string, @Request() req: Req, @Body() dto: StartTestGenDto) {
    return this.testgen.start(problemId, req.user.userId, dto);
  }

  @Get('problems/:problemId/latest')
  @ApiOperation({ summary: 'Lượt sinh test gần nhất của bài' })
  latest(@Param('problemId') problemId: string) {
    return this.testgen.latest(problemId);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Trạng thái / kết quả một lượt sinh test' })
  get(@Param('id') id: string) {
    return this.testgen.get(id);
  }

  @Post('jobs/:id/apply')
  @ApiOperation({ summary: 'Thêm các test đã chọn vào bài (ẩn)' })
  apply(@Param('id') id: string, @Request() req: Req, @Body() dto: ApplyTestGenDto) {
    return this.testgen.apply(id, req.user.userId, dto.candidate_ids);
  }
}
