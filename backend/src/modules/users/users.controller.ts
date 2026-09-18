import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('top-rated')
  @ApiOperation({ summary: 'Lấy bảng xếp hạng top sinh viên có ELO rating cao nhất' })
  @ApiResponse({ status: 200, description: 'Danh sách sinh viên top rated' })
  getTopRated(@Query('limit') limit?: string) {
    return this.usersService.getTopRated(limit ? parseInt(limit, 10) : 10);
  }

  @Get('me')
  @ApiOperation({ summary: 'Lấy thông tin hồ sơ và cài đặt của user hiện tại' })
  @ApiResponse({ status: 200, description: 'Thông tin hồ sơ user' })
  getProfile(@Request() req: { user: { userId: string } }) {
    return this.usersService.getProfile(req.user.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Cập nhật thông tin hồ sơ và cài đặt của user hiện tại' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  updateProfile(
    @Request() req: { user: { userId: string } },
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.userId, updateProfileDto);
  }

  @Post('me/change-password')
  @ApiOperation({ summary: 'Đổi mật khẩu cho user đang đăng nhập' })
  @ApiResponse({ status: 200, description: 'Đổi mật khẩu thành công' })
  changePassword(
    @Request() req: { user: { userId: string } },
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(req.user.userId, changePasswordDto);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Lấy thống kê bài nộp và học tập thực tế của user' })
  @ApiResponse({ status: 200, description: 'Thống kê bài nộp' })
  getUserStats(@Request() req: { user: { userId: string } }) {
    return this.usersService.getUserStats(req.user.userId);
  }

  @Get('me/heatmap')
  @ApiOperation({
    summary:
      'Lấy dữ liệu Activity Heatmap của người dùng hiện tại (365 ngày qua)',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về mảng dữ liệu activity theo ngày kèm thống kê streak.',
    schema: {
      example: {
        current_streak: 5,
        highest_streak: 12,
        last_active_date: '2024-08-27T00:00:00Z',
        activity_logs: [
          { activity_date: '2024-08-26T00:00:00Z', submission_count: 3 },
          { activity_date: '2024-08-27T00:00:00Z', submission_count: 1 },
        ],
      },
    },
  })
  getHeatmap(@Request() req: { user: { userId: string } }) {
    return this.usersService.getHeatmap(req.user.userId);
  }
}

