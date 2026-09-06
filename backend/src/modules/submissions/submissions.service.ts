import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { RunCustomCodeDto } from './dto/run-custom-code.dto';
import { SubmissionStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async findAll(userId: string, userRole: Role) {
    const submissions = await this.prisma.submission.findMany({
      where: userRole === Role.INSTRUCTOR ? undefined : { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        problem: { select: { id: true, title: true } },
        user: { select: { id: true, email: true } },
      },
    });

    return submissions.map((submission) => ({
      id: submission.id,
      problem_id: submission.problem_id,
      problem_title: submission.problem.title,
      user_id: submission.user_id,
      username: submission.user.email.split('@')[0],
      language: submission.language,
      status: submission.status,
      execution_time: submission.execution_time,
      memory_used: submission.memory_used,
      source_code: submission.source_code,
      created_at: submission.created_at,
    }));
  }

  async submitCode(userId: string, createSubmissionDto: CreateSubmissionDto) {
    const { problem_id, language, source_code } = createSubmissionDto;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    // B1: Kiểm tra problem_id có tồn tại
    const problem = await this.prisma.problem.findUnique({
      where: { id: problem_id },
      include: {
        contests: {
          include: { contest: true },
        },
      },
    });

    if (!problem) {
      throw new NotFoundException('Không tìm thấy bài tập với mã cung cấp.');
    }

    // RÀNG BUỘC KỲ THI (Nếu là STUDENT)
    if (user.role === 'STUDENT' && problem.contests.length > 0) {
      const now = new Date();

      // Batch Query: Lấy tất cả thông tin một lần (N+1 Fix)
      const contestIds = problem.contests.map((cp) => cp.contest_id);
      const classIds = problem.contests
        .filter((cp) => cp.contest.is_private && cp.contest.class_id)
        .map((cp) => cp.contest.class_id as string);

      const [enrolledClasses, sessions] = await Promise.all([
        classIds.length > 0
          ? this.prisma.classStudent.findMany({
              where: { student_id: userId, class_id: { in: classIds } },
            })
          : Promise.resolve([]),
        this.prisma.contestSession.findMany({
          where: { student_id: userId, contest_id: { in: contestIds } },
        }),
      ]);

      const enrolledClassSet = new Set(enrolledClasses.map((c) => c.class_id));
      const disqualifiedSessionSet = new Set(
        sessions.filter((s) => s.is_disqualified).map((s) => s.contest_id),
      );

      for (const cp of problem.contests) {
        const contest = cp.contest;

        // 1. Kiểm tra Private Contest (Guard Clause gộp điều kiện)
        if (
          contest.is_private &&
          contest.class_id &&
          !enrolledClassSet.has(contest.class_id)
        ) {
          throw new ForbiddenException(
            'Bạn không có quyền nộp bài cho bài tập thuộc lớp học khác.',
          );
        }

        // 2. Kiểm tra Thời gian thi
        if (now < contest.start_time) {
          throw new BadRequestException(
            'Kỳ thi chưa bắt đầu, không thể nộp bài.',
          );
        }
        if (now > contest.end_time) {
          throw new BadRequestException(
            'Kỳ thi đã kết thúc, không thể nộp bài.',
          );
        }

        // 3. Kiểm tra cấm thi (Anti-cheat)
        if (disqualifiedSessionSet.has(contest.id)) {
          throw new ForbiddenException(
            'Bạn đã bị truất quyền thi cử do vi phạm quy chế (gian lận).',
          );
        }
      }
    }

    // B2: Tạo bản ghi Submission mới với status mặc định PENDING
    const submission = await this.prisma.submission.create({
      data: {
        user_id: userId,
        problem_id: problem.id,
        language,
        source_code,
        status: SubmissionStatus.PENDING,
      },
    });

    // B3: Tạo payload gửi vào Queue
    const payload = {
      submission_id: submission.id,
      problem_id: problem.id,
      language: submission.language,
      source_code: submission.source_code,
    };

    // B4: Gọi hàm publishJudgeJob của QueueService
    // Dù gửi thành công hay thất bại (do RabbitMQ rớt mạng), ta vẫn lưu vào DB thành công ở B2.
    this.queueService.publishJudgeJob(payload);

    // B5: Trả về cho frontend
    return {
      success: true,
      submission_id: submission.id,
      message: 'Code has been submitted and is pending execution.',
    };
  }
  runCustomCode(userId: string, dto: RunCustomCodeDto) {
    const { language, source_code, custom_input = '' } = dto;
    const sessionId = uuidv4();

    this.logger.log(
      `[CustomRun] User ${userId} — session=${sessionId}, lang=${language}`,
    );

    try {
      const payload = {
        is_custom: true, // Cờ quan trọng: Webhook sẽ skip toàn bộ logic DB
        session_id: sessionId, // Frontend join room custom_run_<session_id> để nhận kết quả
        user_id: userId,
        language,
        source_code,
        custom_input,
      };

      this.queueService.publishJudgeJob(payload);

      return {
        success: true,
        session_id: sessionId,
        message:
          'Custom run job queued. Listen for result via Socket.io room: custom_run_' +
          sessionId,
      };
    } catch (error: any) {
      this.logger.error(
        `[CustomRun] Failed to queue job for session=${sessionId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
