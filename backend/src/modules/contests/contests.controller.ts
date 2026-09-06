import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ContestsService } from './contests.service';
import { CreateContestDto } from './dto/create-contest.dto';
import { UpdateContestDto } from './dto/update-contest.dto';
import { AddProblemDto } from './dto/add-problem.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Contests')
@Controller('api/v1/contests')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ContestsController {
  constructor(private readonly contestsService: ContestsService) {}

  @Post()
  @Roles(Role.INSTRUCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo mới một kỳ thi' })
  @ApiResponse({ status: 201, description: 'Kỳ thi đã được tạo thành công.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Chỉ Admin mới có quyền.',
  })
  create(@Body() createContestDto: CreateContestDto) {
    return this.contestsService.create(createContestDto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách tất cả kỳ thi' })
  @ApiResponse({ status: 200, description: 'Danh sách các kỳ thi.' })
  findAll(@Request() req: { user: { userId: string } }) {
    return this.contestsService.findAll(req.user.userId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một kỳ thi' })
  @ApiResponse({ status: 200, description: 'Thông tin chi tiết của kỳ thi.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy kỳ thi.' })
  findOne(@Param('id') id: string) {
    return this.contestsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.INSTRUCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật thông tin kỳ thi' })
  @ApiResponse({
    status: 200,
    description: 'Kỳ thi đã được cập nhật thành công.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy kỳ thi.' })
  update(@Param('id') id: string, @Body() updateContestDto: UpdateContestDto) {
    return this.contestsService.update(id, updateContestDto);
  }

  @Delete(':id')
  @Roles(Role.INSTRUCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa một kỳ thi' })
  @ApiResponse({ status: 200, description: 'Kỳ thi đã được xóa thành công.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy kỳ thi.' })
  remove(@Param('id') id: string) {
    return this.contestsService.remove(id);
  }

  @Post(':id/problems')
  @Roles(Role.INSTRUCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thêm bài tập vào kỳ thi' })
  @ApiResponse({ status: 201, description: 'Bài tập đã được thêm thành công.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy kỳ thi hoặc bài tập.',
  })
  addProblem(@Param('id') id: string, @Body() addProblemDto: AddProblemDto) {
    return this.contestsService.addProblem(id, addProblemDto);
  }

  @Post(':id/anti-cheat/warning')
  @Roles(Role.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Báo cáo hành vi gian lận (chuyển tab, thu nhỏ cửa sổ)',
  })
  @ApiResponse({ status: 201, description: 'Đã ghi nhận cảnh báo.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Chỉ sinh viên mới có thể báo cáo cho chính mình.',
  })
  reportCheatWarning(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.contestsService.reportCheatWarning(id, req.user.userId);
  }

  @Post(':id/calculate-elo')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tính lại ELO rating cho tất cả sinh viên sau khi kỳ thi kết thúc',
  })
  @ApiResponse({
    status: 201,
    description:
      'ELO đã được cập nhật thành công, trả về bảng kết quả thạng/thua ELO.',
  })
  @ApiResponse({
    status: 400,
    description: 'Kỳ thi chưa kết thúc hoặc không có bài tập.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Chỉ Admin mới có quyền.',
  })
  calculateElo(@Param('id') id: string) {
    return this.contestsService.calculateElo(id);
  }
}
