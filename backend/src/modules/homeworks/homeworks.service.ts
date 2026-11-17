import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../../events/events.gateway';

@Injectable()
export class HomeworksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Gắn `submitted_students` cho mỗi bài tập: số sinh viên của lớp đã có ÍT NHẤT MỘT bài nộp
   * (bất kể trạng thái: AC, sai, lỗi biên dịch, 0 test pass...) cho bất kỳ bài nào trong bài tập đó.
   */
  private async withSubmittedCounts<
    T extends { class_id: string; tasks: Prisma.JsonValue },
  >(homeworks: T[]): Promise<Array<T & { submitted_students: number }>> {
    if (homeworks.length === 0) return [];

    const classIds = [...new Set(homeworks.map((h) => h.class_id))];
    const enrollments = await this.prisma.classStudent.findMany({
      where: { class_id: { in: classIds } },
      select: { class_id: true, student_id: true },
    });
    const studentsByClass = new Map<string, Set<string>>();
    for (const e of enrollments) {
      if (!studentsByClass.has(e.class_id))
        studentsByClass.set(e.class_id, new Set());
      studentsByClass.get(e.class_id)!.add(e.student_id);
    }

    const problemIdsOf = (tasks: Prisma.JsonValue): string[] => {
      if (!Array.isArray(tasks)) return [];
      const ids: string[] = [];
      for (const t of tasks as Array<Record<string, unknown>>) {
        const pid =
          t?.problem_id ??
          (typeof t?.id === 'string' && t.id.includes('-') ? t.id : undefined);
        if (typeof pid === 'string') ids.push(pid);
      }
      return ids;
    };

    const allProblemIds = [
      ...new Set(homeworks.flatMap((h) => problemIdsOf(h.tasks))),
    ];
    const allStudentIds = [...new Set(enrollments.map((e) => e.student_id))];
    const submitters =
      allProblemIds.length > 0 && allStudentIds.length > 0
        ? await this.prisma.submission.findMany({
            where: {
              problem_id: { in: allProblemIds },
              user_id: { in: allStudentIds },
            },
            select: { user_id: true, problem_id: true },
            distinct: ['user_id', 'problem_id'],
          })
        : [];
    const usersByProblem = new Map<string, Set<string>>();
    for (const s of submitters) {
      if (!usersByProblem.has(s.problem_id))
        usersByProblem.set(s.problem_id, new Set());
      usersByProblem.get(s.problem_id)!.add(s.user_id);
    }

    return homeworks.map((h) => {
      const classStudents =
        studentsByClass.get(h.class_id) ?? new Set<string>();
      const submitted = new Set<string>();
      for (const pid of problemIdsOf(h.tasks)) {
        for (const uid of usersByProblem.get(pid) ?? []) {
          if (classStudents.has(uid)) submitted.add(uid);
        }
      }
      return { ...h, submitted_students: submitted.size };
    });
  }

  async findAll(userId: string, role: string) {
    const where =
      role === 'INSTRUCTOR'
        ? { class: { admin_id: userId } }
        : { class: { students: { some: { student_id: userId } } } };

    const homeworks = await this.prisma.homework.findMany({
      where,
      include: {
        class: {
          select: { id: true, name: true, invite_code: true, students: true },
        },
      },
      orderBy: { deadline: 'asc' },
    });
    return role === 'INSTRUCTOR'
      ? this.withSubmittedCounts(homeworks)
      : homeworks;
  }

  /** Lấy tất cả homework thuộc một lớp cụ thể (nested route /classes/:classId/homeworks) */
  async findHomeworksByClass(classId: string, userId: string, role: Role) {
    if (role === Role.INSTRUCTOR) {
      const cls = await this.prisma.class.findUnique({
        where: { id: classId },
      });
      if (!cls || cls.admin_id !== userId) {
        throw new ForbiddenException('Bạn không có quyền xem lớp này.');
      }
    } else {
      const enrollment = await this.prisma.classStudent.findUnique({
        where: {
          class_id_student_id: { class_id: classId, student_id: userId },
        },
      });
      if (!enrollment)
        throw new ForbiddenException('Bạn chưa tham gia lớp này.');
    }

    const homeworks = await this.prisma.homework.findMany({
      where: { class_id: classId },
      include: {
        class: { select: { id: true, name: true, invite_code: true } },
      },
      orderBy: { deadline: 'asc' },
    });
    return role === Role.INSTRUCTOR
      ? this.withSubmittedCounts(homeworks)
      : homeworks;
  }

  /** Lấy chi tiết một homework theo classId + homeworkId */
  async findHomeworkByClass(
    classId: string,
    homeworkId: string,
    userId: string,
    role: Role,
  ) {
    if (role === Role.INSTRUCTOR) {
      const cls = await this.prisma.class.findUnique({
        where: { id: classId },
      });
      if (!cls || cls.admin_id !== userId) {
        throw new ForbiddenException('Bạn không có quyền xem lớp này.');
      }
    } else {
      const enrollment = await this.prisma.classStudent.findUnique({
        where: {
          class_id_student_id: { class_id: classId, student_id: userId },
        },
      });
      if (!enrollment)
        throw new ForbiddenException('Bạn chưa tham gia lớp này.');
    }

    const homework = await this.prisma.homework.findFirst({
      where: { id: homeworkId, class_id: classId },
      include: {
        class: {
          select: { id: true, name: true, invite_code: true, students: true },
        },
      },
    });
    if (!homework) throw new NotFoundException('Không tìm thấy bài tập.');
    return homework;
  }

  async create(dto: CreateHomeworkDto) {
    const homework = await this.prisma.homework.create({
      data: {
        title: dto.title,
        description: dto.description,
        deadline: new Date(dto.deadline),
        class_id: dto.class_id,
        tasks: dto.tasks as Prisma.InputJsonValue,
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            students: { select: { student_id: true } },
          },
        },
      },
    });

    // ─── Fire-and-forget: thông báo sinh viên trong lớp ─────────────────────
    const studentIds = homework.class?.students?.map((s) => s.student_id) ?? [];
    if (studentIds.length > 0) {
      const deadlineDate = new Date(dto.deadline).toLocaleDateString('vi-VN');
      this.notificationsService
        .createManyNotifications({
          userIds: studentIds,
          type: 'homework_assigned',
          title: `📋 Bài tập mới: ${dto.title}`,
          body: `Lớp "${homework.class?.name}" vừa giao bài tập mới. Hạn nộp: ${deadlineDate}.`,
          link: `/student/homeworks`,
        })
        .then((notifications) => {
          // Push real-time đến từng sinh viên
          notifications.forEach((notification) => {
            this.eventsGateway.emitNotification(
              notification.user_id,
              notification,
            );
          });
        })
        .catch(() => {
          // silent fail — không block response
        });
    }

    return homework;
  }

  async update(id: string, dto: UpdateHomeworkDto, requestorId: string) {
    const homework = await this.findOne(id);

    const cls = await this.prisma.class.findUnique({
      where: { id: homework.class_id },
    });
    if (!cls || cls.admin_id !== requestorId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa bài tập này.');
    }

    const data: Prisma.HomeworkUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.deadline !== undefined) data.deadline = new Date(dto.deadline);
    if (dto.class_id !== undefined) data.class_id = dto.class_id;
    if (dto.tasks !== undefined)
      data.tasks = dto.tasks as Prisma.InputJsonValue;

    return this.prisma.homework.update({ where: { id }, data });
  }

  async findOne(id: string) {
    const homework = await this.prisma.homework.findUnique({ where: { id } });
    if (!homework) throw new NotFoundException('Không tìm thấy bài tập');
    return homework;
  }

  async remove(id: string, requestorId: string) {
    const homework = await this.findOne(id);

    const cls = await this.prisma.class.findUnique({
      where: { id: homework.class_id },
    });
    if (!cls || cls.admin_id !== requestorId) {
      throw new ForbiddenException('Bạn không có quyền xoá bài tập này.');
    }

    return this.prisma.homework.delete({ where: { id } });
  }
}
