import {
  Injectable,
  NotFoundException,
  ConflictException,
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

  async update(id: string, updateClassDto: UpdateClassDto) {
    await this.findOne(id); // Check exists
    return this.prisma.class.update({
      where: { id },
      data: updateClassDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check exists
    return this.prisma.class.delete({
      where: { id },
    });
  }

  async addStudent(classId: string, addStudentDto: AddStudentDto) {
    await this.findOne(classId); // Check class exists

    const user = await this.prisma.user.findUnique({
      where: { id: addStudentDto.student_id },
    });
    if (!user) throw new NotFoundException('Không tìm thấy sinh viên');

    const existing = await this.prisma.classStudent.findUnique({
      where: {
        class_id_student_id: {
          class_id: classId,
          student_id: addStudentDto.student_id,
        },
      },
    });

    if (existing) throw new ConflictException('Sinh viên đã nằm trong lớp này');

    return this.prisma.classStudent.create({
      data: {
        class_id: classId,
        student_id: addStudentDto.student_id,
      },
    });
  }

  async removeStudent(classId: string, studentId: string) {
    await this.findOne(classId);
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
}
