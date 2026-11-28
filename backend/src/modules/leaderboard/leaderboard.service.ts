import {
  Injectable,
  NotFoundException,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmissionStatus } from '@prisma/client';
import { Redis } from 'ioredis';

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  fullName: string;
  email: string;
  solved: number;
  solvedCount: number;
  penalty: number;
  score: number;
  runtime: number;
  rating: number;
}

export interface ContestProblemResult {
  attempts: number; // số lần nộp (đã chấm)
  score: number; // điểm cao nhất
  solved: boolean; // đã AC
  solved_at_minutes: number | null; // phút kể từ lúc bắt đầu tới lần AC đầu tiên
  runtime: number | null; // runtime (ms) của bài nộp tốt nhất
  latest_submission_id: string | null; // lần nộp gần nhất trong thời gian thi (mọi trạng thái)
}

@Injectable()
export class LeaderboardService implements OnModuleDestroy {
  private redisClient: Redis;
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(private readonly prisma: PrismaService) {
    // Khởi tạo kết nối Redis (cache tùy chọn — lỗi kết nối tự động fallback DB)
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redisClient = new Redis(redisUrl, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      retryStrategy: (times) => Math.min(times * 2000, 30000),
    });
    this.redisClient.on('error', (err) => {
      this.logger.debug(`[LeaderboardService] Redis unavailable: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    try {
      if (this.redisClient.status === 'ready') {
        await this.redisClient.quit();
      } else {
        this.redisClient.disconnect();
      }
    } catch {
      this.redisClient.disconnect();
    }
    this.logger.log('[LeaderboardService] Redis connection closed.');
  }

  /** Kết quả thi chi tiết từng sinh viên theo từng bài (dùng cho giảng viên xem và xuất CSV) */
  async getDetailedResults(contestId: string) {
    // Xóa cache nếu Redis sẵn sàng để kết quả xuất ra luôn mới nhất
    try {
      await this.redisClient.del(`leaderboard:contest:${contestId}`);
    } catch {
      // Bỏ qua nếu Redis không khả dụng
    }
    const standings = await this.getLeaderboard(contestId);

    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        problems: {
          include: { problem: { select: { id: true, title: true } } },
          orderBy: { created_at: 'asc' }, // đúng thứ tự bài trong kỳ thi
        },
      },
    });
    if (!contest) throw new NotFoundException('Không tìm thấy kỳ thi');

    const problems = contest.problems.map((cp) => ({
      id: cp.problem_id,
      title: cp.problem.title,
    }));
    const problemIds = problems.map((p) => p.id);

    const [submissions, sessions] = await Promise.all([
      this.prisma.submission.findMany({
        where: {
          problem_id: { in: problemIds },
          created_at: { gte: contest.start_time, lte: contest.end_time },
        },
        orderBy: { created_at: 'asc' },
        select: {
          id: true,
          user_id: true,
          problem_id: true,
          status: true,
          score: true,
          instructor_score: true,
          execution_time: true,
          created_at: true,
        },
      }),
      this.prisma.contestSession.findMany({
        where: { contest_id: contestId },
        select: {
          student_id: true,
          cheat_warnings: true,
          is_disqualified: true,
        },
      }),
    ]);

    const detail = new Map<string, Record<string, ContestProblemResult>>();
    // Lần nộp gần nhất (submissions đã sắp xếp tăng dần theo thời gian) — tính cả mọi trạng thái
    const latestSubmission = new Map<string, string>();
    for (const sub of submissions) {
      latestSubmission.set(`${sub.user_id}:${sub.problem_id}`, sub.id);
    }
    for (const sub of submissions) {
      if (
        sub.status === SubmissionStatus.PENDING ||
        sub.status === SubmissionStatus.IN_QUEUE
      ) {
        continue;
      }
      let perUser = detail.get(sub.user_id);
      if (!perUser) {
        perUser = {};
        detail.set(sub.user_id, perUser);
      }
      const cell = (perUser[sub.problem_id] ??= {
        attempts: 0,
        score: 0,
        solved: false,
        solved_at_minutes: null,
        runtime: null,
        latest_submission_id:
          latestSubmission.get(`${sub.user_id}:${sub.problem_id}`) ?? null,
      });
      cell.attempts += 1;

      const subScore = sub.instructor_score ?? sub.score ?? 0;
      const subTime = sub.execution_time ?? null;
      if (
        subScore > cell.score ||
        (subScore === cell.score &&
          subScore > 0 &&
          subTime !== null &&
          (cell.runtime === null || subTime < cell.runtime))
      ) {
        cell.score = subScore;
        cell.runtime = subTime;
      }
      if (sub.status === SubmissionStatus.ACCEPTED && !cell.solved) {
        cell.solved = true;
        cell.solved_at_minutes = Math.floor(
          (sub.created_at.getTime() - contest.start_time.getTime()) /
            (1000 * 60),
        );
      }
    }
    // Bài chỉ có lần nộp đang chấm (PENDING/IN_QUEUE) vẫn cần có nút xem mã nguồn
    for (const [key, submissionId] of latestSubmission) {
      const [userId, problemId] = key.split(':');
      let perUser = detail.get(userId);
      if (!perUser) {
        perUser = {};
        detail.set(userId, perUser);
      }
      perUser[problemId] ??= {
        attempts: 0,
        score: 0,
        solved: false,
        solved_at_minutes: null,
        runtime: null,
        latest_submission_id: submissionId,
      };
    }
    const sessionMap = new Map(sessions.map((s) => [s.student_id, s]));

    return {
      contest: {
        id: contest.id,
        title: contest.title,
        start_time: contest.start_time,
        end_time: contest.end_time,
        lockdown_enabled: contest.lockdown_enabled,
        max_cheat_warnings: contest.max_cheat_warnings,
      },
      problems,
      results: standings.map((row) => ({
        ...row,
        cheat_warnings: sessionMap.get(row.user_id)?.cheat_warnings ?? 0,
        is_disqualified: sessionMap.get(row.user_id)?.is_disqualified ?? false,
        problems: detail.get(row.user_id) ?? {},
      })),
    };
  }

  async getLeaderboard(contestId: string) {
    const cacheKey = `leaderboard:contest:${contestId}`;

    // Bước 4: Đọc từ Redis Cache trước (fail-open về DB nếu Redis không khả dụng)
    try {
      const cachedData = await this.redisClient.get(cacheKey);
      if (cachedData) {
        this.logger.log(
          `[Cache Hit] Trả về leaderboard từ Redis cho Contest ${contestId}`,
        );
        return JSON.parse(cachedData) as LeaderboardEntry[];
      }
    } catch {
      // Fallback sang PostgreSQL bên dưới
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
          select: { id: true, email: true, username: true },
        },
      },
    });

    // Bước 2: Thuật toán ICPC
    interface UserStat {
      user_id: string;
      email: string;
      username?: string | null;
      solved: number;
      penalty: number;
      problems: Record<
        string,
        {
          isSolved: boolean;
          wrongAttempts: number;
          bestScore: number; // điểm cao nhất của bài này
          bestTime: number | null; // runtime (ms) của bài nộp có điểm cao nhất
        }
      >;
    }
    const userStatsMap: Record<string, UserStat> = {};

    // Đưa TẤT CẢ sinh viên đã đăng ký tham gia kỳ thi vào bảng xếp hạng ngay từ đầu,
    // kể cả khi chưa nộp hoặc chưa giải được bài nào (solved = 0, penalty = 0).
    const sessions = await this.prisma.contestSession.findMany({
      where: { contest_id: contestId },
      include: {
        student: { select: { id: true, email: true, username: true } },
      },
    });
    for (const session of sessions) {
      userStatsMap[session.student_id] = {
        user_id: session.student_id,
        email: session.student.email,
        username: session.student.username,
        solved: 0,
        penalty: 0,
        problems: {},
      };
    }

    for (const sub of submissions) {
      const userId = sub.user_id;

      if (!userStatsMap[userId]) {
        userStatsMap[userId] = {
          user_id: userId,
          email: sub.user.email,
          username: sub.user.username,
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
          bestScore: 0,
          bestTime: null,
        };
      }

      const probStat = userStat.problems[probId];

      // Điểm & runtime: lấy bài nộp có điểm cao nhất của từng bài (điểm bằng nhau → runtime nhỏ hơn).
      // Chỉ tính các bài đã chấm xong; điểm giảng viên chấm tay (nếu có) được ưu tiên.
      if (
        sub.status !== SubmissionStatus.PENDING &&
        sub.status !== SubmissionStatus.IN_QUEUE
      ) {
        const subScore = sub.instructor_score ?? sub.score ?? 0;
        const subTime = sub.execution_time ?? null;
        const better =
          subScore > probStat.bestScore ||
          (subScore === probStat.bestScore &&
            subScore > 0 &&
            subTime !== null &&
            (probStat.bestTime === null || subTime < probStat.bestTime));
        if (better) {
          probStat.bestScore = subScore;
          probStat.bestTime = subTime;
        }
      }

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

    // Bước 3: Sắp xếp — Điểm giảm dần → Runtime tăng dần (phá hòa) → Solved giảm dần → Penalty tăng dần → tên
    const totals = (stat: UserStat) => {
      let score = 0;
      let runtime = 0;
      for (const p of Object.values(stat.problems)) {
        score += p.bestScore;
        if (p.bestScore > 0) runtime += p.bestTime ?? 0;
      }
      return { score: Math.round(score * 100) / 100, runtime };
    };
    const rows = Object.values(userStatsMap).map((stat) => ({
      stat,
      ...totals(stat),
    }));
    rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.runtime !== b.runtime) return a.runtime - b.runtime;
      if (b.stat.solved !== a.stat.solved) return b.stat.solved - a.stat.solved;
      if (a.stat.penalty !== b.stat.penalty)
        return a.stat.penalty - b.stat.penalty;
      const nameA = a.stat.username ?? a.stat.email;
      const nameB = b.stat.username ?? b.stat.email;
      return nameA.localeCompare(nameB);
    });

    // Loại bỏ dữ liệu tracking nội bộ trước khi trả về
    const sameRank = (x: (typeof rows)[number], y: (typeof rows)[number]) =>
      x.score === y.score &&
      x.runtime === y.runtime &&
      x.stat.solved === y.stat.solved &&
      x.stat.penalty === y.stat.penalty;

    const result = rows.map((row, index) => {
      const { stat } = row;
      // Đồng hạng: cùng điểm, runtime, số bài và penalty thì cùng thứ hạng
      const rank =
        index > 0 && sameRank(rows[index - 1], row)
          ? rows.findIndex((o) => sameRank(o, row)) + 1
          : index + 1;
      return {
        rank,
        user_id: stat.user_id,
        username: stat.username ?? stat.email.split('@')[0],
        fullName: stat.username ?? stat.email.split('@')[0],
        email: stat.email,
        solved: stat.solved,
        solvedCount: stat.solved,
        penalty: stat.penalty,
        score: row.score,
        runtime: row.runtime,
        rating: 0,
      };
    });

    // Cấu hình lưu mảng kết quả này vào Redis với TTL là 30 giây (ex 30)
    try {
      await this.redisClient.setex(cacheKey, 30, JSON.stringify(result));
    } catch {
      // Cache write failure không ảnh hưởng kết quả trả về từ DB
    }

    return result;
  }
}
