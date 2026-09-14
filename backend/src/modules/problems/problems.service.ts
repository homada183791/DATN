import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { PrismaClient, Role } from '@prisma/client';

@Injectable()
export class ProblemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProblemDto: CreateProblemDto) {
    const { test_cases, ...problemData } = createProblemDto;

    return this.prisma.problem.create({
      data: {
        ...problemData,
        test_cases: {
          create: test_cases || [],
        },
      },
      include: { test_cases: true },
    });
  }

  async findAll() {
    return this.prisma.problem.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        time_limit: true,
        memory_limit: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOne(id: string, userRole: Role) {
    const problem = await this.prisma.problem.findUnique({
      where: { id },
      include: {
        test_cases: true,
      },
    });

    if (!problem) {
      throw new NotFoundException('Không tìm thấy bài tập');
    }

    // RBAC logic: Nếu không phải ADMIN, lọc bỏ các test cases bị ẩn
    if (userRole !== Role.INSTRUCTOR) {
      problem.test_cases = problem.test_cases.filter((tc) => !tc.is_hidden);
    }

    return problem;
  }

  async update(id: string, updateProblemDto: UpdateProblemDto) {
    const problem = await this.prisma.problem.findUnique({ where: { id } });
    if (!problem) {
      throw new NotFoundException('Không tìm thấy bài tập để cập nhật');
    }

    const { test_cases, ...problemData } =
      updateProblemDto as Partial<CreateProblemDto>;

    // Nếu có payload test_cases, cách đơn giản nhất là xoá cũ tạo mới
    if (test_cases) {
      // Dùng transaction để đảm bảo toàn vẹn dữ liệu
      return this.prisma.$transaction(async (tx) => {
        await tx.testCase.deleteMany({ where: { problem_id: id } });

        return tx.problem.update({
          where: { id },
          data: {
            ...problemData,
            test_cases: {
              create: test_cases,
            },
          },
          include: { test_cases: true },
        });
      });
    }

    // Nếu không cập nhật test_cases
    return this.prisma.problem.update({
      where: { id },
      data: problemData,
      include: { test_cases: true },
    });
  }

  async remove(id: string) {
    const problem = await this.prisma.problem.findUnique({ where: { id } });
    if (!problem) {
      throw new NotFoundException('Không tìm thấy bài tập để xóa');
    }

    // Do schema đã cấu hình onDelete: Cascade cho TestCase,
    // nên xoá Problem sẽ tự xoá TestCases tương ứng.
    const prisma = this.prisma as PrismaClient;

    return prisma.problem.delete({
      where: { id },
    });
  }
}
