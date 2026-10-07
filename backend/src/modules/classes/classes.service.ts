import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { AddStudentDto } from './dto/add-student.dto';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createClassDto: CreateClassDto, adminId: string) {
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    return this.prisma.class.create({
      data: {
        name: createClassDto.name,
        description: createClassDto.description,
        semester: createClassDto.semester,
        invite_code: inviteCode,
        admin_id: adminId,
      },
    });
  }

  async findAll() {
    return this.prisma.class.findMany({
      include: {
        admin: { select: { id: true, email: true, username: true } },
        students: {
          include: {
            student: {
              select: {
                id: true,
                email: true,
                username: true,
                elo_rating: true,
                _count: {
                  select: {
                    submissions: true,
                  },
                },
              },
            },
          },
        },
        homeworks: {
          select: { id: true },
        },
        contests: {
          select: { id: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id },
      include: {
        admin: { select: { id: true, email: true, username: true } },
        students: {
          include: {
            student: {
              select: {
                id: true,
                email: true,
                username: true,
                elo_rating: true,
                created_at: true,
                _count: {
                  select: {
                    submissions: true,
                  },
                },
              },
            },
          },
          orderBy: { joined_at: 'asc' },
        },
        homeworks: {
          orderBy: { deadline: 'asc' },
        },
        contests: {
          select: { id: true, title: true, start_time: true, end_time: true },
        },
      },
    });
    if (!cls) throw new NotFoundException('Không tìm thấy lớp học');
    return cls;
  }

  async update(id: string, updateClassDto: UpdateClassDto, instructorId: string) {
    const cls = await this.findOne(id);
    if (cls.admin_id !== instructorId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa lớp học này.');
    }
    return this.prisma.class.update({
      where: { id },
      data: updateClassDto,
    });
  }

  async remove(id: string, instructorId: string) {
    const cls = await this.findOne(id);
    if (cls.admin_id !== instructorId) {
      throw new ForbiddenException('Bạn không có quyền xóa lớp học này.');
    }
    return this.prisma.class.delete({
      where: { id },
    });
  }

  async addStudent(classId: string, addStudentDto: AddStudentDto, instructorId: string) {
    const cls = await this.findOne(classId);
    if (cls.admin_id !== instructorId) {
      throw new ForbiddenException('Bạn không có quyền thêm sinh viên vào lớp học này.');
    }

    if (!addStudentDto.email && !addStudentDto.student_id) {
      throw new BadRequestException('Vui lòng cung cấp email hoặc ID của sinh viên');
    }

    const user = await this.prisma.user.findFirst({
      where: addStudentDto.email
        ? { email: { equals: addStudentDto.email.trim().toLowerCase(), mode: 'insensitive' } }
        : { id: addStudentDto.student_id },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản sinh viên với thông tin đã cung cấp');
    }

    const existing = await this.prisma.classStudent.findUnique({
      where: {
        class_id_student_id: {
          class_id: classId,
          student_id: user.id,
        },
      },
    });

    if (existing) throw new ConflictException('Sinh viên đã nằm trong lớp này');

    return this.prisma.classStudent.create({
      data: {
        class_id: classId,
        student_id: user.id,
      },
    });
  }

  async removeStudent(classId: string, studentId: string, instructorId?: string) {
    const cls = await this.findOne(classId);
    // Chỉ kiểm tra quyền sở hữu khi kick sinh viên (instructorId được truyền).
    // Sinh viên tự rời lớp (từ endpoint /leave) không truyền instructorId.
    if (instructorId && cls.admin_id !== instructorId) {
      throw new ForbiddenException('Bạn không có quyền xóa sinh viên khỏi lớp học này.');
    }
    return this.prisma.classStudent.delete({
      where: {
        class_id_student_id: {
          class_id: classId,
          student_id: studentId,
        },
      },
    });
  }

  async joinStudent(classId: string, studentId: string) {
    await this.findOne(classId);
    const existing = await this.prisma.classStudent.findUnique({
      where: { class_id_student_id: { class_id: classId, student_id: studentId } },
    });
    if (existing) throw new ConflictException('Sinh viên đã nằm trong lớp này');

    return this.prisma.classStudent.create({
      data: { class_id: classId, student_id: studentId },
    });
  }

  async joinByCode(inviteCode: string, studentId: string) {
    const cls = await this.prisma.class.findUnique({
      where: { invite_code: inviteCode.trim().toUpperCase() },
    });
    if (!cls) throw new NotFoundException(`Không tìm thấy lớp với mã "${inviteCode}".`);
    return this.joinStudent(cls.id, studentId);
  }

  async getGradebook(classId: string, instructorId?: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          include: {
            student: {
              select: {
                id: true,
                email: true,
                username: true,
                full_name: true,
              },
            },
          },
          orderBy: { joined_at: 'asc' },
        },
        homeworks: {
          orderBy: { deadline: 'asc' },
        },
      },
    });

    if (!cls) {
      throw new NotFoundException('Không tìm thấy lớp học.');
    }

    if (instructorId && cls.admin_id !== instructorId) {
      throw new ForbiddenException('Bạn không có quyền xem sổ điểm của lớp này.');
    }

    // Lấy tất cả problem_ids từ các bài tập về nhà của lớp
    const allTaskProblems: Array<{
      homework_id: string;
      homework_title: string;
      task_id: string;
      problem_id?: string;
      title: string;
      points: number;
    }> = [];

    const homeworkColumns = cls.homeworks.map((hw) => {
      const tasks = Array.isArray(hw.tasks) ? (hw.tasks as any[]) : [];
      const parsedTasks = tasks.map((t, idx) => {
        const taskId = t.id || `task_${idx}`;
        const problemId = t.problem_id || (t.id && String(t.id).includes('-') ? t.id : undefined);
        const taskInfo = {
          task_id: taskId,
          problem_id: problemId,
          title: t.title || `Bài ${idx + 1}`,
          points: Number(t.points) || 10,
        };
        allTaskProblems.push({
          homework_id: hw.id,
          homework_title: hw.title,
          ...taskInfo,
        });
        return taskInfo;
      });

      return {
        homework_id: hw.id,
        homework_title: hw.title,
        deadline: hw.deadline,
        tasks: parsedTasks,
      };
    });

    // Lấy tất cả submissions của các sinh viên trong lớp cho các bài toán này
    const studentIds = cls.students.map((s) => s.student.id);
    const problemIds = allTaskProblems
      .map((t) => t.problem_id)
      .filter((pid): pid is string => Boolean(pid));

    const submissions = problemIds.length > 0 && studentIds.length > 0
      ? await this.prisma.submission.findMany({
          where: {
            user_id: { in: studentIds },
            problem_id: { in: problemIds },
          },
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            user_id: true,
            problem_id: true,
            status: true,
            score: true,
            instructor_score: true,
            instructor_feedback: true,
            created_at: true,
          },
        })
      : [];

    // Map sinh viên với kết quả từng bài tập
    const studentGrades = cls.students.map((entry) => {
      const st = entry.student;
      let completedTasks = 0;
      let totalAssignedScore = 0;
      let totalEarnedScore = 0;

      const grades = allTaskProblems.map((task) => {
        totalAssignedScore += task.points;
        const studentSubs = task.problem_id
          ? submissions.filter((s) => s.user_id === st.id && s.problem_id === task.problem_id)
          : [];

        // Tìm bài nộp tốt nhất (ACCEPTED ưu tiên hàng đầu, hoặc điểm cao nhất)
        const acSub = studentSubs.find((s) => s.status === 'ACCEPTED');
        const bestSub = acSub || studentSubs[0] || null;

        const isAccepted = bestSub?.status === 'ACCEPTED';
        if (isAccepted) completedTasks++;

        let effectiveScore = 0;
        if (bestSub) {
          if (bestSub.instructor_score !== null && bestSub.instructor_score !== undefined) {
            effectiveScore = (bestSub.instructor_score / 10) * task.points;
          } else if (isAccepted) {
            effectiveScore = task.points;
          } else {
            effectiveScore = ((bestSub.score || 0) / 100) * task.points;
          }
        }
        totalEarnedScore += effectiveScore;

        return {
          homework_id: task.homework_id,
          homework_title: task.homework_title,
          task_id: task.task_id,
          problem_id: task.problem_id,
          task_title: task.title,
          points: task.points,
          status: bestSub ? bestSub.status : 'NOT_SUBMITTED',
          score: bestSub ? bestSub.score : 0,
          instructor_score: bestSub ? bestSub.instructor_score : null,
          instructor_feedback: bestSub ? bestSub.instructor_feedback : null,
          submission_id: bestSub ? bestSub.id : null,
          submitted_at: bestSub ? bestSub.created_at : null,
        };
      });

      const totalTasks = allTaskProblems.length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const finalScore = totalAssignedScore > 0 ? Math.round((totalEarnedScore / totalAssignedScore) * 100) / 10 : 0;

      return {
        id: st.id,
        email: st.email,
        username: st.username,
        full_name: st.full_name,
        summary: {
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          completion_rate: completionRate,
          final_score: finalScore,
        },
        grades,
      };
    });

    return {
      class_id: cls.id,
      class_name: cls.name,
      total_students: cls.students.length,
      total_homeworks: cls.homeworks.length,
      homework_columns: homeworkColumns,
      students: studentGrades,
    };
  }
}
