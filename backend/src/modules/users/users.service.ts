import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

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

      const lastActive = user.last_active_date
        ? new Date(user.last_active_date)
        : null;
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
          where: {
            user_id_activity_date: { user_id: userId, activity_date: today },
          },
          create: {
            user_id: userId,
            activity_date: today,
            submission_count: 1,
          },
          update: { submission_count: { increment: 1 } },
        });
      });

      this.logger.log(
        `[Streak] User ${userId}: streak=${newStreak}, highest=${newHighest}`,
      );
    } catch (error: any) {
      // Không throw để tránh làm gián đoạn luồng Webhook chính
      this.logger.error(
        `[Streak] Failed to update streak for user ${userId}: ${error.message}`,
        error.stack,
      );
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
      select: {
        current_streak: true,
        highest_streak: true,
        last_active_date: true,
      },
    });

    return {
      current_streak: user?.current_streak ?? 0,
      highest_streak: user?.highest_streak ?? 0,
      last_active_date: user?.last_active_date ?? null,
      activity_logs: logs,
    };
  }

  /**
   * Lấy danh sách sinh viên có ELO rating cao nhất toàn trường.
   */
  async getTopRated(limit = 10) {
    const take = Number(limit) > 0 ? Math.min(Number(limit), 50) : 10;
    const users = await this.prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        username: true,
        email: true,
        elo_rating: true,
        current_streak: true,
        highest_streak: true,
        created_at: true,
        _count: {
          select: {
            submissions: {
              where: { status: 'ACCEPTED' },
            },
          },
        },
      },
      orderBy: [
        { elo_rating: 'desc' },
        { current_streak: 'desc' },
      ],
      take,
    });

    return users.map((u) => ({
      id: u.id,
      username: u.username || u.email.split('@')[0],
      email: u.email,
      elo_rating: u.elo_rating,
      current_streak: u.current_streak,
      highest_streak: u.highest_streak,
      solved_count: u._count.submissions,
      created_at: u.created_at,
    }));
  }

  /**
   * Lấy thông tin profile đầy đủ của user
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        full_name: true,
        bio: true,
        institution: true,
        avatar_url: true,
        role: true,
        elo_rating: true,
        current_streak: true,
        highest_streak: true,
        last_active_date: true,
        notification_settings: true,
        preferences: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return user;
  }

  /**
   * Cập nhật thông tin profile và cấu hình cài đặt
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const dataToUpdate: any = {};
    if (dto.full_name !== undefined) dataToUpdate.full_name = dto.full_name?.trim() || null;
    if (dto.bio !== undefined) dataToUpdate.bio = dto.bio?.trim() || null;
    if (dto.institution !== undefined) dataToUpdate.institution = dto.institution?.trim() || null;
    if (dto.avatar_url !== undefined) dataToUpdate.avatar_url = dto.avatar_url?.trim() || null;
    if (dto.notification_settings !== undefined) dataToUpdate.notification_settings = dto.notification_settings;
    if (dto.preferences !== undefined) dataToUpdate.preferences = dto.preferences;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        username: true,
        full_name: true,
        bio: true,
        institution: true,
        avatar_url: true,
        role: true,
        elo_rating: true,
        current_streak: true,
        highest_streak: true,
        last_active_date: true,
        notification_settings: true,
        preferences: true,
        created_at: true,
        updated_at: true,
      },
    });

    return updated;
  }

  /**
   * Đổi mật khẩu cho người dùng đang đăng nhập (dùng bcrypt hash đồng bộ với hệ thống auth)
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const isPasswordValid = await bcrypt.compare(dto.current_password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.new_password, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true, message: 'Đổi mật khẩu thành công' };
  }

  /**
   * Tính toán số liệu thống kê bài giải, nộp bài, tỷ lệ AC từ database thật
   */
  async getUserStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, elo_rating: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Lấy toàn bộ bài nộp của user kèm thông tin problem
    const submissions = await this.prisma.submission.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        problem_id: true,
        status: true,
        created_at: true,
        problem: {
          select: {
            id: true,
            title: true,
            difficulty: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const totalSubmissions = submissions.length;
    const acSubmissions = submissions.filter((s) => s.status === 'ACCEPTED');

    // Danh sách bài đã giải (lọc distinct problem_id)
    const solvedMap = new Map<string, { id: string; title: string; difficulty: string }>();
    for (const s of acSubmissions) {
      if (!solvedMap.has(s.problem_id)) {
        solvedMap.set(s.problem_id, {
          id: s.problem.id,
          title: s.problem.title,
          difficulty: s.problem.difficulty,
        });
      }
    }
    const solvedProblems = Array.from(solvedMap.values());
    const solvedCount = solvedProblems.length;
    const acRate = totalSubmissions > 0 ? Math.round((acSubmissions.length / totalSubmissions) * 100) : 0;

    // Phân bố verdict
    const verdictStats: Record<string, number> = {
      AC: 0,
      WA: 0,
      TLE: 0,
      MLE: 0,
      RTE: 0,
      CE: 0,
    };
    for (const s of submissions) {
      const status = s.status;
      if (status === 'ACCEPTED') verdictStats.AC++;
      else if (status === 'WRONG_ANSWER') verdictStats.WA++;
      else if (status === 'TIME_LIMIT_EXCEEDED') verdictStats.TLE++;
      else if (status === 'COMPILE_ERROR') verdictStats.CE++;
      else if (status === 'RUNTIME_ERROR') verdictStats.RTE++;
      else if ((status as string) === 'MEMORY_LIMIT_EXCEEDED') verdictStats.MLE++;
    }

    // Thống kê dành cho Instructor (nếu là giảng viên)
    let instructorStats: any = null;
    if (user.role === 'INSTRUCTOR') {
      const [managedClassesCount, createdContestsCount, studentsCount] = await Promise.all([
        this.prisma.class.count({ where: { admin_id: userId } }),
        this.prisma.contest.count({ where: { class: { admin_id: userId } } }),
        this.prisma.classStudent.count({ where: { class: { admin_id: userId } } }),
      ]);
      instructorStats = {
        classes_count: managedClassesCount,
        contests_count: createdContestsCount,
        total_students_count: studentsCount,
      };
    }

    return {
      total_submissions: totalSubmissions,
      solved_count: solvedCount,
      ac_rate: acRate,
      verdict_stats: verdictStats,
      solved_problems: solvedProblems,
      instructor_stats: instructorStats,
    };
  }
}
