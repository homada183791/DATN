import {
  Injectable,
  NotFoundException,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmissionStatus } from '@prisma/client';
import { Redis } from 'ioredis';

@Injectable()
export class LeaderboardService implements OnModuleDestroy {
  private redisClient: Redis;
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(private readonly prisma: PrismaService) {
    // Khởi tạo kết nối Redis
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redisClient = new Redis(redisUrl);
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
    this.logger.log('[LeaderboardService] Redis connection closed.');
  }

  async getLeaderboard(contestId: string) {
    const cacheKey = `leaderboard:contest:${contestId}`;

    // Bước 4: Đọc từ Redis Cache trước
    const cachedData = await this.redisClient.get(cacheKey);
    if (cachedData) {
      this.logger.log(
        `[Cache Hit] Trả về leaderboard từ Redis cho Contest ${contestId}`,
      );
      return JSON.parse(cachedData);
    }

    this.logger.log(
      `[Cache Miss] Đang tính toán leaderboard từ Database cho Contest ${contestId}...`,
    );

    // Bước 1: Query Contest và Submissions
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        problems: {
          select: { problem_id: true },
        },
      },
    });

    if (!contest) {
      throw new NotFoundException('Không tìm thấy kỳ thi');
    }

    const problemIds = contest.problems.map((cp) => cp.problem_id);

    // Lấy toàn bộ submission trong khoảng thời gian thi của các problem này
    const submissions = await this.prisma.submission.findMany({
      where: {
        problem_id: { in: problemIds },
        created_at: {
          gte: contest.start_time,
          lte: contest.end_time,
        },
      },
      orderBy: { created_at: 'asc' }, // Bắt buộc sắp xếp tăng dần để duyệt từ đầu kỳ thi
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });

    // Bước 2: Thuật toán ICPC
    interface UserStat {
      user_id: string;
      email: string;
      solved: number;
      penalty: number;
      problems: Record<string, { isSolved: boolean; wrongAttempts: number }>;
    }
    const userStatsMap: Record<string, UserStat> = {};

    for (const sub of submissions) {
      const userId = sub.user_id;

      if (!userStatsMap[userId]) {
        userStatsMap[userId] = {
          user_id: userId,
          email: sub.user.email,
          solved: 0,
          penalty: 0,
          problems: {}, // Track trạng thái của từng problem
        };
      }

      const userStat = userStatsMap[userId];
      const probId = sub.problem_id;

      if (!userStat.problems[probId]) {
        userStat.problems[probId] = {
          isSolved: false,
          wrongAttempts: 0,
        };
      }

      const probStat = userStat.problems[probId];

      // Nếu đã solved bài này trước đó, bỏ qua các submission sau (không tính penalty thêm)
      if (probStat.isSolved) {
        continue;
      }

      if (sub.status === SubmissionStatus.ACCEPTED) {
        // Đánh dấu là đã solved
        probStat.isSolved = true;
        userStat.solved += 1;

        // Tính penalty: thời gian từ lúc bắt đầu thi (phút) + (số lần nộp sai * 20 phút)
        const timeDiffMs =
          sub.created_at.getTime() - contest.start_time.getTime();
        const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));

        userStat.penalty += timeDiffMinutes + probStat.wrongAttempts * 20;
      } else if (
        sub.status !== SubmissionStatus.PENDING &&
        sub.status !== SubmissionStatus.IN_QUEUE &&
        sub.status !== SubmissionStatus.COMPILE_ERROR // Theo luật ICPC thường không tính penalty cho CE
      ) {
        probStat.wrongAttempts += 1;
      }
    }

    // Bước 3: Sắp xếp (Solved giảm dần, Penalty tăng dần)
    const leaderboard = Object.values(userStatsMap);
    leaderboard.sort((a, b) => {
      if (b.solved !== a.solved) {
        return b.solved - a.solved; // Nhiều solved hơn thì lên trên
      }
      return a.penalty - b.penalty; // Nếu solved bằng nhau, penalty ít hơn thì lên trên
    });

    // Loại bỏ dữ liệu tracking nội bộ trước khi trả về
    const result = leaderboard.map((stat, index) => ({
      rank: index + 1,
      user_id: stat.user_id,
      username: stat.email.split('@')[0],
      fullName: stat.email.split('@')[0],
      email: stat.email,
      solved: stat.solved,
      solvedCount: stat.solved,
      penalty: stat.penalty,
      rating: 0,
    }));

    // Cấu hình lưu mảng kết quả này vào Redis với TTL là 30 giây (ex 30)
    await this.redisClient.setex(cacheKey, 30, JSON.stringify(result));

    return result;
  }
}
