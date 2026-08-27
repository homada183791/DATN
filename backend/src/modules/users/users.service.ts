import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cập nhật Streak và ghi log Activity sau mỗi bài nộp ACCEPTED.
   * Logic:
   *  - Nếu last_active_date là HÔM NAY  → chỉ upsert (tăng submission_count), không đổi streak.
   *  - Nếu last_active_date là HÔM QUA  → current_streak += 1, tạo log mới.
   *  - Nếu cách quá 1 ngày hoặc chưa từng active → reset current_streak = 1, tạo log mới.
   *  - Luôn cập nhật highest_streak nếu current_streak vượt qua.
   */
  async updateUserStreak(userId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0); // normalize về đầu ngày

      const lastActive = user.last_active_date ? new Date(user.last_active_date) : null;
      if (lastActive) lastActive.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let newStreak = user.current_streak;

      if (lastActive) {
        const isToday = lastActive.getTime() === today.getTime();
        const isYesterday = lastActive.getTime() === yesterday.getTime();

        if (isToday) {
          // Đã active hôm nay rồi → chỉ tăng submission_count, giữ nguyên streak
        } else if (isYesterday) {
          // Hôm qua active → tiếp tục chuỗi
          newStreak = user.current_streak + 1;
        } else {
          // Gián đoạn quá 1 ngày → reset
          newStreak = 1;
        }
      } else {
        // Chưa có ngày active nào → bắt đầu streak = 1
        newStreak = 1;
      }

      const newHighest = Math.max(user.highest_streak, newStreak);

      // Cập nhật Database với Transaction
      await this.prisma.$transaction(async (tx) => {
        // Cập nhật User
        await tx.user.update({
          where: { id: userId },
          data: {
            current_streak: newStreak,
            highest_streak: newHighest,
            last_active_date: today,
          },
        });

        // Upsert Activity Log (Hôm nay đã active thì tăng count, chưa thì tạo mới)
        await tx.userActivityLog.upsert({
          where: { user_id_activity_date: { user_id: userId, activity_date: today } },
          create: { user_id: userId, activity_date: today, submission_count: 1 },
          update: { submission_count: { increment: 1 } },
        });
      });

      this.logger.log(`[Streak] User ${userId}: streak=${newStreak}, highest=${newHighest}`);
    } catch (error) {
      // Không throw để tránh làm gián đoạn luồng Webhook chính
      this.logger.error(`[Streak] Failed to update streak for user ${userId}: ${error.message}`, error.stack);
    }
  }

  /**
   * Trả về mảng dữ liệu activity 365 ngày qua để Frontend vẽ GitHub Heatmap.
   */
  async getHeatmap(userId: string) {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const logs = await this.prisma.userActivityLog.findMany({
      where: {
        user_id: userId,
        activity_date: { gte: oneYearAgo },
      },
      orderBy: { activity_date: 'asc' },
      select: {
        activity_date: true,
        submission_count: true,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { current_streak: true, highest_streak: true, last_active_date: true },
    });

    return {
      current_streak: user?.current_streak ?? 0,
      highest_streak: user?.highest_streak ?? 0,
      last_active_date: user?.last_active_date ?? null,
      activity_logs: logs,
    };
  }
}
