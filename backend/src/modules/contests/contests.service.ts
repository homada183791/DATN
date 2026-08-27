import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../events/events.gateway';
import { CreateContestDto } from './dto/create-contest.dto';
import { UpdateContestDto } from './dto/update-contest.dto';
import { AddProblemDto } from './dto/add-problem.dto';

@Injectable()
export class ContestsService {
  private readonly logger = new Logger(ContestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async create(createContestDto: CreateContestDto) {
    return this.prisma.contest.create({
      data: {
        title: createContestDto.title,
        description: createContestDto.description,
        start_time: new Date(createContestDto.start_time),
        end_time: new Date(createContestDto.end_time),
        is_private: createContestDto.is_private,
        class_id: createContestDto.class_id,
      },
    });
  }

  async findAll(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    if (user.role === 'ADMIN') {
      return this.prisma.contest.findMany({
        orderBy: { created_at: 'desc' },
      });
    }

    // STUDENT: Chỉ thấy Public hoặc Private thuộc lớp đã tham gia
    const enrolledClasses = await this.prisma.classStudent.findMany({
      where: { student_id: userId },
      select: { class_id: true }
    });
    const classIds = enrolledClasses.map(c => c.class_id);

    return this.prisma.contest.findMany({
      where: {
        OR: [
          { is_private: false },
          { is_private: true, class_id: { in: classIds } }
        ]
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const contest = await this.prisma.contest.findUnique({
      where: { id },
      include: {
        problems: {
          include: {
            problem: {
              select: {
                id: true,
                title: true,
                difficulty: true,
              }
            },
          }
        },
      },
    });

    if (!contest) {
      throw new NotFoundException('Không tìm thấy kỳ thi');
    }

    return contest;
  }

  async update(id: string, updateContestDto: UpdateContestDto) {
    const contest = await this.prisma.contest.findUnique({ where: { id } });
    if (!contest) throw new NotFoundException('Không tìm thấy kỳ thi');

    const updateData: any = { ...updateContestDto };
    if (updateContestDto.start_time) updateData.start_time = new Date(updateContestDto.start_time);
    if (updateContestDto.end_time) updateData.end_time = new Date(updateContestDto.end_time);

    return this.prisma.contest.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    const contest = await this.prisma.contest.findUnique({ where: { id } });
    if (!contest) throw new NotFoundException('Không tìm thấy kỳ thi');

    return this.prisma.contest.delete({
      where: { id },
    });
  }

  async addProblem(contestId: string, addProblemDto: AddProblemDto) {
    const { problem_id } = addProblemDto;

    // Check contest
    const contest = await this.prisma.contest.findUnique({ where: { id: contestId } });
    if (!contest) throw new NotFoundException('Không tìm thấy kỳ thi');

    // Check problem
    const problem = await this.prisma.problem.findUnique({ where: { id: problem_id } });
    if (!problem) throw new NotFoundException('Không tìm thấy bài tập');

    // Check if already exists
    const existing = await this.prisma.contestProblem.findUnique({
      where: {
        contest_id_problem_id: {
          contest_id: contestId,
          problem_id: problem_id,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Bài tập này đã tồn tại trong kỳ thi');
    }

    return this.prisma.contestProblem.create({
      data: {
        contest_id: contestId,
        problem_id: problem_id,
      },
    });
  }

  async reportCheatWarning(contestId: string, studentId: string) {
    const contest = await this.prisma.contest.findUnique({ where: { id: contestId } });
    if (!contest) throw new NotFoundException('Không tìm thấy kỳ thi');

    const session = await this.prisma.contestSession.upsert({
      where: { contest_id_student_id: { contest_id: contestId, student_id: studentId } },
      update: { cheat_warnings: { increment: 1 } },
      create: { contest_id: contestId, student_id: studentId, cheat_warnings: 1, is_disqualified: false },
      include: { student: { select: { email: true } } }
    });

    let isDisqualified = session.is_disqualified;
    if (session.cheat_warnings >= 3 && !isDisqualified) {
      isDisqualified = true;
      await this.prisma.contestSession.update({ where: { id: session.id }, data: { is_disqualified: true } });
    }

    this.eventsGateway.emitAdminDashboardUpdate(contestId, {
      student_id: studentId,
      cheat_warnings: session.cheat_warnings,
      is_disqualified: isDisqualified,
    });

    return { success: true, cheat_warnings: session.cheat_warnings, is_disqualified: isDisqualified };
  }

  async calculateElo(contestId: string) {
    const contest = await this.prisma.contest.findUnique({ where: { id: contestId } });
    if (!contest) throw new NotFoundException('Không tìm thấy kỳ thi');

    const now = new Date();
    if (contest.end_time > now) {
      throw new BadRequestException('Kỳ thi chưa kết thúc, không thể tính ELO.');
    }

    // Lấy Leaderboard: tổng điểm cao nhất mỗi sinh viên trong kỳ thi
    const contestProblems = await this.prisma.contestProblem.findMany({
      where: { contest_id: contestId },
      select: { problem_id: true }
    });
    const problemIds = contestProblems.map(cp => cp.problem_id);

    if (problemIds.length === 0) {
      throw new BadRequestException('Kỳ thi không có bài tập nào.');
    }

    // Lấy bài nộp tốt nhất của mỗi sinh viên cho mỗi bài trong khoảng thời gian kỳ thi
    const submissions = await this.prisma.submission.findMany({
      where: {
        problem_id: { in: problemIds },
        created_at: { gte: contest.start_time, lte: contest.end_time },
      },
      orderBy: { score: 'desc' },
      include: { user: { select: { id: true, elo_rating: true, email: true } } },
    });

    // Gom tổng điểm mỗi sinh viên (lấy điểm cao nhất của từng bài)
    const bestScoreMap = new Map<string, { user: any; totalScore: number; bestPerProblem: Map<string, number> }>();
    for (const sub of submissions) {
      const uid = sub.user_id;
      if (!bestScoreMap.has(uid)) {
        bestScoreMap.set(uid, { user: sub.user, totalScore: 0, bestPerProblem: new Map() });
      }
      const entry = bestScoreMap.get(uid)!;
      const prevBest = entry.bestPerProblem.get(sub.problem_id) ?? 0;
      if (sub.score > prevBest) {
        entry.totalScore += (sub.score - prevBest);
        entry.bestPerProblem.set(sub.problem_id, sub.score);
      }
    }

    // Sắp xếp theo tổng điểm giảm dần (Leaderboard)
    const leaderboard = Array.from(bestScoreMap.values())
      .sort((a, b) => b.totalScore - a.totalScore);

    if (leaderboard.length < 2) {
      return { message: 'Không đủ sinh viên để tính ELO (cần ít nhất 2 người).' };
    }

    // Thuật toán Multiplayer ELO
    // Mỗi người được so sánh với ELO trung bình của toàn bộ người dưới họ và trên họ
    const K = 32; // Hệ số K (càng cao ELO thay đổi càng mạnh)
    const N = leaderboard.length;
    const eloChanges: { userId: string; delta: number; newElo: number }[] = [];

    for (let i = 0; i < N; i++) {
      const player = leaderboard[i];
      const currentElo = player.user.elo_rating;
      let totalDelta = 0;

      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        const opponent = leaderboard[j];
        const opponentElo = opponent.user.elo_rating;

        // Xác suất thắng dự kiến theo công thức Elo
        const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - currentElo) / 400));
        
        // Kết quả thực tế
        let actualScore = 0.5; // Hòa
        if (player.totalScore > opponent.totalScore) {
          actualScore = 1; // Thắng
        } else if (player.totalScore < opponent.totalScore) {
          actualScore = 0; // Thua
        }

        totalDelta += K * (actualScore - expectedScore);
      }

      // Chia trung bình delta theo số đối thủ
      const avgDelta = totalDelta / (N - 1);
      const newElo = Math.max(0, Math.round(currentElo + avgDelta));

      eloChanges.push({ userId: player.user.id, delta: Math.round(avgDelta), newElo });
    }

    // Cập nhật đồng loạt bằng Prisma Transaction
    await this.prisma.$transaction(
      eloChanges.map(change =>
        this.prisma.user.update({
          where: { id: change.userId },
          data: { elo_rating: change.newElo },
        })
      )
    );

    this.logger.log(`[ELO] Contest ${contestId}: Updated ELO for ${eloChanges.length} players.`);

    return {
      success: true,
      contest_id: contestId,
      results: eloChanges.map((c, idx) => ({
        rank: idx + 1,
        user_id: c.userId,
        elo_delta: c.delta,
        new_elo: c.newElo,
      })),
    };
  }
}
