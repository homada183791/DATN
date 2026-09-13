import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Lấy hồ sơ đầy đủ của người dùng hiện tại' })
  @ApiResponse({
    status: 200,
    description: 'Trả về id, email, role, elo_rating, streak, ngày tham gia.',
  })
  getMe(@Request() req: { user: { userId: string } }) {
    return this.usersService.getMe(req.user.userId);
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
