import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionsService } from './submissions.service';
import { ProblemsService } from '../problems/problems.service';
import { ContestsService } from '../contests/contests.service';
import { ClassesService } from '../classes/classes.service';
import { HomeworksService } from '../homeworks/homeworks.service';
import { AiService } from '../ai/ai.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { EventsGateway } from '../../events/events.gateway';
import { LocalJudgeService } from './local-judge.service';
import { WebhookService } from '../webhook/webhook.service';
import {
  BadRequestException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Role, Language, SubmissionStatus, Difficulty } from '@prisma/client';
import { HintType } from '../ai/dto/tutor-hint.dto';

describe('Student Role - Comprehensive Business Logic & Edge Cases', () => {
  let submissionsService: SubmissionsService;
  let problemsService: ProblemsService;
  let contestsService: ContestsService;
  let classesService: ClassesService;
  let homeworksService: HomeworksService;
  let aiService: AiService;
  let notificationsService: NotificationsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      problem: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      submission: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      contest: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      contestProblem: {
        findUnique: jest.fn(),
      },
      contestSession: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      class: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      classStudent: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      homework: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      notification: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      submissionTestResult: {
        createMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        ProblemsService,
        ContestsService,
        ClassesService,
        HomeworksService,
        AiService,
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: QueueService, useValue: { publishJudgeJob: jest.fn().mockReturnValue(true) } },
        {
          provide: EventsGateway,
          useValue: {
            emitSubmissionUpdate: jest.fn(),
            emitAdminDashboardUpdate: jest.fn(),
            emitLeaderboardUpdate: jest.fn(),
            server: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
          },
        },
        {
          provide: LocalJudgeService,
          useValue: {
            evaluateSubmission: jest.fn(),
            evaluateCustomRun: jest.fn(),
          },
        },
        {
          provide: WebhookService,
          useValue: { processJudgeResult: jest.fn() },
        },
      ],
    }).compile();

    submissionsService = module.get<SubmissionsService>(SubmissionsService);
    problemsService = module.get<ProblemsService>(ProblemsService);
    contestsService = module.get<ContestsService>(ContestsService);
    classesService = module.get<ClassesService>(ClassesService);
    homeworksService = module.get<HomeworksService>(HomeworksService);
    aiService = module.get<AiService>(AiService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
  });

  // =========================================================================
  // DOMAIN 1: Kho bài tập & Bảo mật Đề bài (Problems & Testcase RBAC)
  // =========================================================================
  describe('Domain 1: Problems & Testcase Masking', () => {
    it('[TC-PROB-01] Sinh viên chỉ xem được testcase công khai, ẩn testcase bí mật', async () => {
      const mockTestCases = [
        { id: 'tc-1', input: '1 2', expected_output: '3', is_hidden: false },
        { id: 'tc-2', input: '100 200', expected_output: '300', is_hidden: true },
        { id: 'tc-3', input: '0 0', expected_output: '0', is_hidden: true },
      ];

      prisma.problem.findUnique.mockResolvedValue({
        id: 'p-1',
        title: 'Tính tổng hai số',
        test_cases: [...mockTestCases],
      });

      // Role: STUDENT
      const studentResult = await problemsService.findOne('p-1', Role.STUDENT);
      expect(studentResult.test_cases).toHaveLength(1);
      expect(studentResult.test_cases[0].id).toBe('tc-1');
      expect(studentResult.test_cases[0].is_hidden).toBe(false);

      // Reset mock cho Instructor
      prisma.problem.findUnique.mockResolvedValue({
        id: 'p-1',
        title: 'Tính tổng hai số',
        test_cases: [...mockTestCases],
      });

      // Role: INSTRUCTOR
      const instructorResult = await problemsService.findOne('p-1', Role.INSTRUCTOR);
      expect(instructorResult.test_cases).toHaveLength(3);
    });

    it('[TC-PROB-02] Từ chối ngôn ngữ không nằm trong allowed_languages', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'student-1', role: 'STUDENT' });
      prisma.problem.findUnique.mockResolvedValue({
        id: 'p-cpp',
        allowed_languages: ['CPP17', 'CPP20'],
        contests: [],
        time_limit: 1000,
        memory_limit: 256,
        test_cases: [],
      });

      await expect(
        submissionsService.submitCode('student-1', {
          problem_id: 'p-cpp',
          language: Language.PYTHON,
          language_version: 'PYTHON3_11',
          source_code: 'print("test")',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('[TC-PROB-03] Chấp nhận khi allowed_languages rỗng (mở cho mọi ngôn ngữ)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'student-1', role: 'STUDENT' });
      prisma.problem.findUnique.mockResolvedValue({
        id: 'p-open',
        allowed_languages: [],
        contests: [],
        time_limit: 1000,
        memory_limit: 256,
        test_cases: [],
      });
      prisma.submission.create.mockResolvedValue({ id: 'sub-new', status: 'PENDING' });

      const res = await submissionsService.submitCode('student-1', {
        problem_id: 'p-open',
        language: Language.JAVA,
        language_version: 'JAVA17',
        source_code: 'class Main {}',
      });

      expect(res.success).toBe(true);
      expect(res.submission_id).toBe('sub-new');
    });
  });

  // =========================================================================
  // DOMAIN 2: Bài nộp & Quyền truy cập Submissions (RBAC & Masking)
  // =========================================================================
  describe('Domain 2: Submissions Access & Masking', () => {
    it('[TC-SUB-01] Sinh viên không thể xem bài nộp của sinh viên khác (403 Forbidden)', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        id: 'sub-other',
        user_id: 'student-victim',
        problem: { test_cases: [] },
        user: { id: 'student-victim', email: 'vic@edu.vn' },
        test_results: [],
      });

      await expect(
        submissionsService.findOne('sub-other', 'student-attacker', Role.STUDENT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('[TC-SUB-02] Sinh viên xem bài nộp của chính mình thành công, che dấu input/output của testcase ẩn', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        id: 'sub-own',
        user_id: 'student-1',
        problem: {
          id: 'p-1',
          title: 'A + B',
          difficulty: Difficulty.EASY,
          time_limit: 1000,
          memory_limit: 256,
          test_cases: [
            { id: 'tc-open', input: '1 2', expected_output: '3', is_hidden: false },
            { id: 'tc-secret', input: '99 1', expected_output: '100', is_hidden: true },
          ],
        },
        user: { id: 'student-1', email: 'stu@edu.vn' },
        test_results: [
          { id: 'tr-0', testcase_index: 0, status: 'ACCEPTED', execution_time: 10, memory_used: 5, actual_output: '3' },
          { id: 'tr-1', testcase_index: 1, status: 'WRONG_ANSWER', execution_time: 12, memory_used: 5, actual_output: '99' },
        ],
      });

      const res = await submissionsService.findOne('sub-own', 'student-1', Role.STUDENT);

      expect(res.id).toBe('sub-own');
      expect(res.test_results).toHaveLength(2);

      // Testcase công khai: hiển thị đầy đủ
      expect(res.test_results[0].is_hidden).toBe(false);
      expect(res.test_results[0].input).toBe('1 2');
      expect(res.test_results[0].expected_output).toBe('3');
      expect(res.test_results[0].actual_output).toBe('3');

      // Testcase ẩn: đã bị che giấu dữ liệu nhạy cảm
      expect(res.test_results[1].is_hidden).toBe(true);
      expect(res.test_results[1].input).toBeUndefined();
      expect(res.test_results[1].expected_output).toBeUndefined();
      expect(res.test_results[1].actual_output).toBeUndefined();
      // Nhưng vẫn biết trạng thái để học tập
      expect(res.test_results[1].status).toBe('WRONG_ANSWER');
    });
  });

  // =========================================================================
  // DOMAIN 3: Kỳ thi & Ràng buộc thời gian / Chống gian lận (Contest Arena)
  // =========================================================================
  describe('Domain 3: Contest Arena & Anti-Cheat Logic', () => {
    it('[TC-CONT-01] Báo cáo gian lận (chuyển tab/thu nhỏ cửa sổ) tăng số lần cảnh báo', async () => {
      prisma.contest.findUnique.mockResolvedValue({ id: 'c-1', title: 'Giữa kỳ' });
      prisma.contestSession.upsert.mockResolvedValue({
        id: 'sess-1',
        cheat_warnings: 1,
        is_disqualified: false,
        student: { email: 'student@edu.vn' },
      });

      const res = await contestsService.reportCheatWarning('c-1', 'student-1');
      expect(res.success).toBe(true);
      expect(res.cheat_warnings).toBe(1);
      expect(res.is_disqualified).toBe(false);
    });

    it('[TC-CONT-02] Đạt ngưỡng 3 lần cảnh báo sẽ tự động bị truất quyền thi (is_disqualified = true)', async () => {
      prisma.contest.findUnique.mockResolvedValue({ id: 'c-1', title: 'Giữa kỳ' });
      prisma.contestSession.upsert.mockResolvedValue({
        id: 'sess-1',
        cheat_warnings: 3,
        is_disqualified: false,
        student: { email: 'student@edu.vn' },
      });
      prisma.contestSession.update.mockResolvedValue({
        id: 'sess-1',
        is_disqualified: true,
      });

      const res = await contestsService.reportCheatWarning('c-1', 'student-1');
      expect(res.cheat_warnings).toBe(3);
      expect(res.is_disqualified).toBe(true);
      expect(prisma.contestSession.update).toHaveBeenCalledWith({
        where: { id: 'sess-1' },
        data: { is_disqualified: true },
      });
    });

    it('[TC-CONT-03] Sinh viên bị truất quyền không thể nộp bài thi (403 Forbidden)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'student-1', role: 'STUDENT' });
      const now = new Date();
      prisma.problem.findUnique.mockResolvedValue({
        id: 'p-contest',
        allowed_languages: [],
        contests: [
          {
            contest_id: 'c-1',
            contest: {
              id: 'c-1',
              start_time: new Date(now.getTime() - 100000),
              end_time: new Date(now.getTime() + 100000),
              is_private: false,
              class_id: null,
            },
          },
        ],
        time_limit: 1000,
        memory_limit: 256,
        test_cases: [],
      });

      // Session đã bị cấm thi
      prisma.contestSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        is_disqualified: true,
      });

      await expect(
        submissionsService.submitCode('student-1', {
          problem_id: 'p-contest',
          contest_id: 'c-1',
          language: Language.CPP,
          source_code: 'int main(){}',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('[TC-CONT-04] Từ chối nộp bài khi kỳ thi chưa bắt đầu hoặc đã kết thúc', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'student-1', role: 'STUDENT' });
      const now = new Date();

      // Trường hợp 1: Chưa bắt đầu
      prisma.problem.findUnique.mockResolvedValue({
        id: 'p-future',
        allowed_languages: [],
        contests: [
          {
            contest_id: 'c-future',
            contest: {
              id: 'c-future',
              start_time: new Date(now.getTime() + 60000), // 1 phút nữa mới mở
              end_time: new Date(now.getTime() + 3600000),
              is_private: false,
              class_id: null,
            },
          },
        ],
        time_limit: 1000,
        memory_limit: 256,
        test_cases: [],
      });

      await expect(
        submissionsService.submitCode('student-1', {
          problem_id: 'p-future',
          contest_id: 'c-future',
          language: Language.CPP,
          source_code: 'int main(){}',
        }),
      ).rejects.toThrow(BadRequestException);

      // Trường hợp 2: Đã kết thúc
      prisma.problem.findUnique.mockResolvedValue({
        id: 'p-past',
        allowed_languages: [],
        contests: [
          {
            contest_id: 'c-past',
            contest: {
              id: 'c-past',
              start_time: new Date(now.getTime() - 3600000),
              end_time: new Date(now.getTime() - 60000), // đã hết giờ 1 phút trước
              is_private: false,
              class_id: null,
            },
          },
        ],
        time_limit: 1000,
        memory_limit: 256,
        test_cases: [],
      });

      await expect(
        submissionsService.submitCode('student-1', {
          problem_id: 'p-past',
          contest_id: 'c-past',
          language: Language.CPP,
          source_code: 'int main(){}',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('[TC-CONT-05] Kỳ thi riêng tư (Private Contest): sinh viên chưa tham gia lớp bị chặn nộp bài (403 Forbidden)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'student-1', role: 'STUDENT' });
      const now = new Date();
      prisma.problem.findUnique.mockResolvedValue({
        id: 'p-private',
        allowed_languages: [],
        contests: [
          {
            contest_id: 'c-priv',
            contest: {
              id: 'c-priv',
              start_time: new Date(now.getTime() - 10000),
              end_time: new Date(now.getTime() + 500000),
              is_private: true,
              class_id: 'class-vip',
            },
          },
        ],
        time_limit: 1000,
        memory_limit: 256,
        test_cases: [],
      });

      // Sinh viên không có trong lớp class-vip
      prisma.classStudent.findUnique.mockResolvedValue(null);

      await expect(
        submissionsService.submitCode('student-1', {
          problem_id: 'p-private',
          contest_id: 'c-priv',
          language: Language.CPP,
          source_code: 'int main(){}',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // DOMAIN 4: Lớp học & Bài tập về nhà (Classroom & Homework)
  // =========================================================================
  describe('Domain 4: Classroom & Homework RBAC', () => {
    it('[TC-CLASS-01] Tham gia lớp riêng tư bằng mã mời đúng thành công', async () => {
      prisma.class.findUnique.mockResolvedValue({
        id: 'class-1',
        is_public: false,
        invite_code: 'CODE123',
      });
      prisma.classStudent.findUnique.mockResolvedValue(null); // chưa có trong lớp
      prisma.classStudent.create.mockResolvedValue({ class_id: 'class-1', student_id: 'student-1' });

      const res = await classesService.joinStudent('class-1', 'student-1', 'CODE123');
      expect(res).toBeDefined();
      expect(prisma.classStudent.create).toHaveBeenCalled();
    });

    it('[TC-CLASS-02] Tham gia lớp riêng tư với mã mời sai bị từ chối (403 Forbidden)', async () => {
      prisma.class.findUnique.mockResolvedValue({
        id: 'class-1',
        is_public: false,
        invite_code: 'CODE123',
      });

      await expect(
        classesService.joinStudent('class-1', 'student-1', 'WRONG_CODE'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('[TC-CLASS-03] Tham gia lớp đã là thành viên sẽ báo Conflict (409 Conflict)', async () => {
      prisma.class.findUnique.mockResolvedValue({
        id: 'class-1',
        is_public: true,
        invite_code: 'CODE123',
      });
      // Đã có bản ghi trong lớp
      prisma.classStudent.findUnique.mockResolvedValue({
        class_id: 'class-1',
        student_id: 'student-1',
      });

      await expect(
        classesService.joinStudent('class-1', 'student-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('[TC-CLASS-04] Sinh viên tự rời khỏi lớp học thành công', async () => {
      prisma.class.findUnique.mockResolvedValue({ id: 'class-1', admin_id: 'instructor-1' });
      prisma.classStudent.delete.mockResolvedValue({ class_id: 'class-1', student_id: 'student-1' });

      // Khi student tự rời lớp, không truyền instructorId
      await classesService.removeStudent('class-1', 'student-1');
      expect(prisma.classStudent.delete).toHaveBeenCalledWith({
        where: { class_id_student_id: { class_id: 'class-1', student_id: 'student-1' } },
      });
    });

    it('[TC-CLASS-05] Sinh viên không thể xem sổ điểm của lớp học (403 Forbidden)', async () => {
      prisma.class.findUnique.mockResolvedValue({
        id: 'class-1',
        admin_id: 'instructor-1',
        students: [],
        homeworks: [],
      });

      await expect(
        classesService.getGradebook('class-1', 'student-not-admin'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('[TC-HW-01] Sinh viên không thể xem bài tập của lớp chưa tham gia (403 Forbidden)', async () => {
      prisma.classStudent.findUnique.mockResolvedValue(null);

      await expect(
        homeworksService.findHomeworkByClass('class-locked', 'hw-1', 'student-1', Role.STUDENT),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // DOMAIN 5: Trợ lý AI (AI Tutor & Contest Lockdown)
  // =========================================================================
  describe('Domain 5: AI Assistant & Contest Lockdown', () => {
    it('[TC-AI-01] AI Tutor hỗ trợ học viên gợi ý tư duy khi luyện tập bình thường', async () => {
      prisma.problem.findUnique.mockResolvedValue({
        id: 'p-1',
        title: 'Two Sum',
        description: 'Find two numbers...',
        difficulty: Difficulty.EASY,
      });

      const res = await aiService.getTutorHint(
        {
          problem_id: 'p-1',
          hint_type: HintType.COMPLEXITY,
          current_code: 'for i in range(n):',
          language: 'python',
        },
        'student-1',
      );

      expect(res.success).toBe(true);
      expect(res.response).toContain('Phân tích Độ phức tạp');
      expect(res.response).toContain('Độ phức tạp thời gian tối ưu');
    });

    it('[TC-AI-02] AI Tutor bị khóa hoàn toàn khi đang thi trực tiếp (403 Forbidden)', async () => {
      const now = new Date();
      prisma.contest.findUnique.mockResolvedValue({
        id: 'c-active',
        start_time: new Date(now.getTime() - 10000),
        end_time: new Date(now.getTime() + 100000),
      });

      await expect(
        aiService.getTutorHint(
          {
            problem_id: 'p-1',
            contest_id: 'c-active',
            hint_type: HintType.HINT,
            language: 'cpp',
            current_code: 'int main() {}',
          },
          'student-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('[TC-AI-03] AI Explain Error phân tích chi tiết lỗi WRONG_ANSWER', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        id: 'sub-wa',
        status: 'WRONG_ANSWER',
        problem: { id: 'p-1', title: 'Binary Search', difficulty: Difficulty.MEDIUM },
        test_results: [
          { testcase_index: 2, status: 'WRONG_ANSWER', actual_output: 'Output: 42' },
        ],
      });

      const res = await aiService.explainError(
        { submission_id: 'sub-wa' },
        'student-1',
      );

      expect(res.success).toBe(true);
      expect(res.analysis).toContain('Phân tích Lỗi Wrong Answer');
      expect(res.analysis).toContain('Output: 42');
    });
  });

  // =========================================================================
  // DOMAIN 6: Hệ thống thông báo (Notifications RBAC)
  // =========================================================================
  describe('Domain 6: Notifications RBAC', () => {
    it('[TC-NOTIF-01] Sinh viên không thể đánh dấu đọc thông báo của người khác (403 Forbidden)', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        user_id: 'victim-student',
        is_read: false,
      });

      await expect(
        notificationsService.markAsRead('notif-1', 'attacker-student'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('[TC-NOTIF-02] Sinh viên không thể xóa thông báo của người khác (403 Forbidden)', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        user_id: 'victim-student',
      });

      await expect(
        notificationsService.deleteNotification('notif-1', 'attacker-student'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
