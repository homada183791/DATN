import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../../events/events.gateway';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { RunCustomCodeDto } from './dto/run-custom-code.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { Role, SubmissionStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly notificationsService: NotificationsService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async findAll(userId: string, userRole: Role, problemId?: string) {
    type SubmissionListRow = {
      id: string;
      problem_id: string;
      problem: { id: string; title: string };
      user_id: string;
      user: { id: string; email: string; username?: string | null };
      language: string;
      status: SubmissionStatus;
      score: number;
      instructor_score: number | null;
      instructor_feedback: string | null;
      graded_by: string | null;
      graded_at: Date | null;
      execution_time: number | null;
      memory_used: number | null;
      source_code: string;
      created_at: Date;
    };

    const where: any = {};
    if (userRole !== ('INSTRUCTOR' as Role)) {
      where.user_id = userId;
    }
    if (problemId) {
      where.problem_id = problemId;
    }

    // The Prisma delegate may be unresolved when the generated client is not
    // available to the type-aware linter.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const submissions = (await this.prisma.submission.findMany({
      where,
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
      score: submission.score,
      instructor_score: submission.instructor_score,
      instructor_feedback: submission.instructor_feedback,
      graded_by: submission.graded_by,
      graded_at: submission.graded_at,
      execution_time: submission.execution_time,
      memory_used: submission.memory_used,
      source_code: submission.source_code,
      created_at: submission.created_at,
    }));
  }

  async findOne(id: string, userId: string, userRole: Role) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            difficulty: true,
            time_limit: true,
            memory_limit: true,
            test_cases: {
              select: {
                id: true,
                input: true,
                expected_output: true,
                is_hidden: true,
              },
            },
          },
        },
        user: {
          select: { id: true, email: true, username: true, full_name: true },
        },
        test_results: {
          orderBy: { testcase_index: 'asc' },
          select: {
            id: true,
            testcase_index: true,
            status: true,
            execution_time: true,
            memory_used: true,
            actual_output: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Không tìm thấy bài nộp.');
    }

    if (userRole !== Role.INSTRUCTOR && submission.user_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem bài nộp này.');
    }

    const isInstructor = userRole === Role.INSTRUCTOR;
    const testCases = submission.problem.test_cases || [];

    const enrichedTestResults = submission.test_results.map((tr) => {
      const tc = testCases[tr.testcase_index] ?? testCases[0];
      const isHidden = tc?.is_hidden ?? false;
      const canView = isInstructor || !isHidden;

      return {
        id: tr.id,
        testcase_index: tr.testcase_index,
        status: tr.status,
        execution_time: tr.execution_time,
        memory_used: tr.memory_used,
        is_hidden: isHidden,
        input: canView ? tc?.input : undefined,
        expected_output: canView ? tc?.expected_output : undefined,
        actual_output: canView ? tr.actual_output : undefined,
      };
    });

    return {
      id: submission.id,
      problem_id: submission.problem_id,
      problem_title: submission.problem.title,
      problem_difficulty: submission.problem.difficulty,
      user_id: submission.user_id,
      username: submission.user.username ?? submission.user.email.split('@')[0],
      email: submission.user.email,
      language: submission.language,
      status: submission.status,
      score: submission.score,
      instructor_score: submission.instructor_score,
      instructor_feedback: submission.instructor_feedback,
      graded_by: submission.graded_by,
      graded_at: submission.graded_at,
      execution_time: submission.execution_time,
      memory_used: submission.memory_used,
      source_code: submission.source_code,
      created_at: submission.created_at,
      updated_at: submission.updated_at,
      test_results: enrichedTestResults,
    };
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
      time_limit: number;
      memory_limit: number;
      test_cases: Array<{
        id: string;
        input: string;
        expected_output: string;
        is_hidden: boolean;
      }>;
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const problem = (await this.prisma.problem.findUnique({
      where: { id: problem_id },
      include: {
        test_cases: true,
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
      is_custom: false,
      submission_id: submission.id,
      problem_id: problem.id,
      language,
      source_code,
      time_limit: problem.time_limit,
      memory_limit: problem.memory_limit,
      test_cases: problem.test_cases,
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

  async gradeSubmission(id: string, instructorId: string, dto: GradeSubmissionDto) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        problem: { select: { id: true, title: true } },
      },
    });

    if (!submission) {
      throw new NotFoundException('Không tìm thấy bài nộp.');
    }

    const updated = await this.prisma.submission.update({
      where: { id },
      data: {
        instructor_score: dto.instructor_score,
        instructor_feedback: dto.instructor_feedback?.trim() || null,
        graded_by: instructorId,
        graded_at: new Date(),
      },
    });

    // Tạo thông báo cho sinh viên
    await this.notificationsService.createNotification({
      userId: submission.user_id,
      type: 'submission_graded',
      title: `📝 Bài nộp đã được chấm: ${submission.problem.title}`,
      body: `Giảng viên đã chấm ${dto.instructor_score} điểm cho bài nộp của bạn.${dto.instructor_feedback ? ` Nhận xét: "${dto.instructor_feedback}"` : ''}`,
      link: `/student/problem/${submission.problem_id}`,
    });

    // Bắn realtime websocket tới sinh viên
    this.eventsGateway.server?.to(`user_${submission.user_id}`).emit('submission_graded', {
      submission_id: id,
      problem_id: submission.problem_id,
      instructor_score: updated.instructor_score,
      instructor_feedback: updated.instructor_feedback,
      graded_at: updated.graded_at,
    });

    return updated;
  }

  async rejudgeSubmission(id: string, _instructorId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        problem: {
          include: { test_cases: true },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Không tìm thấy bài nộp.');
    }

    // Reset kết quả bài nộp về PENDING
    const updated = await this.prisma.submission.update({
      where: { id },
      data: {
        status: SubmissionStatus.PENDING,
        score: 0,
        execution_time: null,
        memory_used: null,
      },
    });

    // Xóa kết quả testcase cũ
    await this.prisma.submissionTestResult.deleteMany({
      where: { submission_id: id },
    });

    // Đẩy job chấm lại vào RabbitMQ
    this.queueService.publishJudgeJob({
      is_custom: false,
      submission_id: submission.id,
      problem_id: submission.problem_id,
      source_code: submission.source_code,
      language: submission.language,
      time_limit: submission.problem.time_limit,
      memory_limit: submission.problem.memory_limit,
      test_cases: submission.problem.test_cases,
    });

    // Phát socket update
    this.eventsGateway.emitSubmissionUpdate(id, {
      submission_id: id,
      status: 'PENDING',
    });

    return {
      success: true,
      message: 'Bài nộp đã được đưa vào hàng đợi để chấm lại.',
      submission: updated,
    };
  }

  async rejudgeProblem(problemId: string, instructorId: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        test_cases: true,
        submissions: { select: { id: true } },
      },
    });

    if (!problem) {
      throw new NotFoundException('Không tìm thấy bài toán.');
    }

    let rejudgeCount = 0;
    for (const sub of problem.submissions) {
      await this.rejudgeSubmission(sub.id, instructorId);
      rejudgeCount++;
    }

    return {
      success: true,
      message: `Đã đưa ${rejudgeCount} bài nộp của bài toán vào hàng đợi chấm lại.`,
      count: rejudgeCount,
    };
  }
}
