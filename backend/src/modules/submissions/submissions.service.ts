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
import { Role, SubmissionStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async findAll(userId: string, userRole: Role) {
    type SubmissionListRow = {
      id: string;
      problem_id: string;
      problem: { id: string; title: string };
      user_id: string;
      user: { id: string; email: string; username?: string | null };
      language: string;
      status: SubmissionStatus;
      execution_time: number | null;
      memory_used: number | null;
      source_code: string;
      created_at: Date;
    };

    // The Prisma delegate may be unresolved when the generated client is not
    // available to the type-aware linter.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const submissions = (await this.prisma.submission.findMany({
      where:
        userRole === ('INSTRUCTOR' as Role) ? undefined : { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        problem: { select: { id: true, title: true } },
        user: { select: { id: true, email: true, username: true } },
      },
    })) as unknown as SubmissionListRow[];

    return submissions.map((submission) => ({
      id: submission.id,
      problem_id: submission.problem_id,
      problem_title: submission.problem.title,
      user_id: submission.user_id,
      username: submission.user.username ?? submission.user.email.split('@')[0],
      language: submission.language,
      status: submission.status as SubmissionStatus,
      execution_time: submission.execution_time,
      memory_used: submission.memory_used,
      source_code: submission.source_code,
      created_at: submission.created_at,
    }));
  }

  async submitCode(userId: string, createSubmissionDto: CreateSubmissionDto) {
    const { problem_id, language, source_code, contest_id }: CreateSubmissionDto =
      createSubmissionDto;

    // The Prisma delegate may be unresolved when the generated client is not
    // available to the type-aware linter.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    // B1: Kiểm tra problem_id có tồn tại
    type SubmissionProblem = {
      id: string;
      contests: Array<{
        contest_id: string;
        contest: {
          id: string;
          start_time: Date;
          end_time: Date;
          is_private: boolean;
          class_id: string | null;
        };
      }>;
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const problem = (await this.prisma.problem.findUnique({
      where: { id: problem_id },
      include: {
        contests: {
          include: {
            contest: {
              select: {
                id: true,
                start_time: true,
                end_time: true,
                is_private: true,
                class_id: true,
              },
            },
          },
        },
      },
    })) as unknown as SubmissionProblem | null;

    if (!problem) {
      throw new NotFoundException('Không tìm thấy bài tập với mã cung cấp.');
    }

    // RÀNG BUỘC KỲ THI: Chỉ áp dụng khi sinh viên nộp bài TRONG PHÒNG THI (có contest_id).
    // Nếu không có contest_id, bài nộp là luyện tập tự do — không bị chặn bởi kỳ thi cũ.
    if (user.role === 'STUDENT' && contest_id) {
      const now = new Date();

      // Tìm kỳ thi mà client chỉ định
      const targetContestEntry = problem.contests.find(
        (cp) => cp.contest_id === contest_id,
      );

      if (!targetContestEntry) {
        throw new BadRequestException(
          'Bài tập này không thuộc kỳ thi đã chỉ định.',
        );
      }

      const contest = targetContestEntry.contest;

      // 1. Kiểm tra Private Contest: sinh viên phải thuộc lớp liên kết
      if (contest.is_private && contest.class_id) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const enrollment = await this.prisma.classStudent.findUnique({
          where: {
            class_id_student_id: {
              class_id: contest.class_id,
              student_id: userId,
            },
          },
        });
        if (!enrollment) {
          throw new ForbiddenException(
            'Bạn không có quyền nộp bài cho kỳ thi thuộc lớp học này.',
          );
        }
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const session = await this.prisma.contestSession.findUnique({
        where: {
          contest_id_student_id: {
            contest_id: contest.id,
            student_id: userId,
          },
        },
      });
      const isDisqualified = (
        session as unknown as { is_disqualified: boolean } | null
      )?.is_disqualified;
      if (isDisqualified) {
        throw new ForbiddenException(
          'Bạn đã bị truất quyền thi cử do vi phạm quy chế (gian lận).',
        );
      }
    }

    // B2: Tạo bản ghi Submission mới với status mặc định PENDING
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const submission = await this.prisma.submission.create({
      data: {
        user_id: userId,
        problem_id: problem.id,
        language,
        source_code,
        status: 'PENDING' as SubmissionStatus,
      },
    });

    // B3: Tạo payload gửi vào Queue
    const payload = {
      submission_id: submission.id,
      problem_id: problem.id,
      language,
      source_code,
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

  async runCustomCode(userId: string, dto: RunCustomCodeDto) {
    const { language, source_code, custom_input = '' } = dto;
    const sessionId = randomUUID();

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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `[CustomRun] Failed to queue job for session=${sessionId}: ${message}`,
        stack,
      );
      throw error;
    }
  }
}
