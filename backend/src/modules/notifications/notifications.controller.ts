import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';

interface AuthRequest {
  user: { userId: string; role: string };
}

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thông báo của tài khoản hiện tại' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Danh sách thông báo có phân trang' })
  getNotifications(
    @Request() req: AuthRequest,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.notificationsService.getUserNotifications(req.user.userId, limit, offset);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Đếm số thông báo chưa đọc' })
  @ApiResponse({ status: 200, description: '{ count: number }' })
  getUnreadCount(@Request() req: AuthRequest) {
    return this.notificationsService.getUnreadCount(req.user.userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo là đã đọc' })
  @ApiResponse({ status: 200, description: '{ updated: number }' })
  markAllAsRead(@Request() req: AuthRequest) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu 1 thông báo là đã đọc' })
  @ApiResponse({ status: 200, description: 'Notification updated' })
  markAsRead(
    @Param('id') id: string,
    @Request() req: AuthRequest,
  ) {
    return this.notificationsService.markAsRead(id, req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoá 1 thông báo' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  deleteNotification(
    @Param('id') id: string,
    @Request() req: AuthRequest,
  ) {
    return this.notificationsService.deleteNotification(id, req.user.userId);
  }
}
