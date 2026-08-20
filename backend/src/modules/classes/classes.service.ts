import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
        invite_code: inviteCode,
        admin_id: adminId,
      },
    });
  }

  async findAll() {
    return this.prisma.class.findMany({
      include: { admin: { select: { id: true, email: true } } },
    });
  }

  async findOne(id: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id },
      include: { 
        admin: { select: { id: true, email: true } },
        students: { include: { student: { select: { id: true, email: true } } } }
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
      where: { id: addStudentDto.student_id }
    });
    if (!user) throw new NotFoundException('Không tìm thấy sinh viên');

    const existing = await this.prisma.classStudent.findUnique({
      where: {
        class_id_student_id: {
          class_id: classId,
          student_id: addStudentDto.student_id,
        }
      }
    });

    if (existing) throw new ConflictException('Sinh viên đã nằm trong lớp này');

    return this.prisma.classStudent.create({
      data: {
        class_id: classId,
        student_id: addStudentDto.student_id,
      }
    });
  }
}
