import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo 1 thông báo cho 1 user cụ thể.
   */
  async createNotification(params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        user_id: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link ?? null,
      },
    });
  }

  /**
   * Tạo thông báo cho nhiều user cùng lúc (broadcast).
   * Returns array of created notifications.
   */
  async createManyNotifications(params: {
    userIds: string[];
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
  }) {
    if (!params.userIds || params.userIds.length === 0) return [];

    const data = params.userIds.map((userId) => ({
      user_id: userId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link ?? null,
    }));

    await this.prisma.notification.createMany({ data });

    // Return the created notifications for WebSocket push
    return this.prisma.notification.findMany({
      where: {
        user_id: { in: params.userIds },
        type: params.type,
        title: params.title,
      },
      orderBy: { created_at: 'desc' },
      take: params.userIds.length,
    });
  }

  /**
   * Lấy danh sách thông báo của user hiện tại (phân trang).
   */
  async getUserNotifications(userId: string, limit = 20, offset = 0) {
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: Math.min(limit, 50),
        skip: offset,
      }),
      this.prisma.notification.count({ where: { user_id: userId } }),
    ]);

    return {
      notifications,
      total,
      unread: await this.prisma.notification.count({
        where: { user_id: userId, is_read: false },
      }),
    };
  }

  /**
   * Đếm số thông báo chưa đọc.
   */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { user_id: userId, is_read: false },
    });
    return { count };
  }

  /**
   * Đánh dấu 1 thông báo đã đọc (chỉ owner mới được).
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) throw new NotFoundException('Không tìm thấy thông báo.');
    if (notification.user_id !== userId)
      throw new ForbiddenException('Bạn không có quyền thao tác thông báo này.');

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true },
    });
  }

  /**
   * Đánh dấu TẤT CẢ thông báo của user là đã đọc.
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true },
    });
    return { updated: result.count };
  }

  /**
   * Xoá thông báo (owner only).
   */
  async deleteNotification(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) throw new NotFoundException('Không tìm thấy thông báo.');
    if (notification.user_id !== userId)
      throw new ForbiddenException('Bạn không có quyền xoá thông báo này.');

    return this.prisma.notification.delete({ where: { id: notificationId } });
  }
}
