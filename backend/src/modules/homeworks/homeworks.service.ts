import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';

@Injectable()
export class HomeworksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, role: string) {
    const where = role === 'INSTRUCTOR'
      ? { class: { admin_id: userId } }
      : { class: { students: { some: { student_id: userId } } } };

    return this.prisma.homework.findMany({
      where,
      include: { class: { select: { id: true, name: true, invite_code: true, students: true } } },
      orderBy: { deadline: 'asc' },
    });
  }

  async create(dto: CreateHomeworkDto) {
    return this.prisma.homework.create({
      data: {
        title: dto.title,
        description: dto.description,
        deadline: new Date(dto.deadline),
        class_id: dto.class_id,
        tasks: dto.tasks as Prisma.InputJsonValue,
      },
    });
  }

  async update(id: string, dto: UpdateHomeworkDto, requestorId: string) {
    const homework = await this.findOne(id);

    // Kiểm tra ownership: homework phải thuộc lớp do requestor quản lý
    const cls = await this.prisma.class.findUnique({ where: { id: homework.class_id } });
    if (!cls || cls.admin_id !== requestorId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa bài tập này.');
    }

    const data: Prisma.HomeworkUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.deadline !== undefined) data.deadline = new Date(dto.deadline);
    if (dto.class_id !== undefined) data.class_id = dto.class_id;
    if (dto.tasks !== undefined) data.tasks = dto.tasks as Prisma.InputJsonValue;

    return this.prisma.homework.update({
      where: { id },
      data,
    });
  }

  async findOne(id: string) {
    const homework = await this.prisma.homework.findUnique({ where: { id } });
    if (!homework) throw new NotFoundException('Không tìm thấy bài tập');
    return homework;
  }

  async remove(id: string, requestorId: string) {
    const homework = await this.findOne(id);

    // Kiểm tra ownership: homework phải thuộc lớp do requestor quản lý
    const cls = await this.prisma.class.findUnique({ where: { id: homework.class_id } });
    if (!cls || cls.admin_id !== requestorId) {
      throw new ForbiddenException('Bạn không có quyền xoá bài tập này.');
    }

    return this.prisma.homework.delete({ where: { id } });
  }
}