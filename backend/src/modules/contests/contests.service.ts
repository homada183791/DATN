import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContestDto } from './dto/create-contest.dto';
import { UpdateContestDto } from './dto/update-contest.dto';
import { AddProblemDto } from './dto/add-problem.dto';

@Injectable()
export class ContestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createContestDto: CreateContestDto) {
    return this.prisma.contest.create({
      data: {
        title: createContestDto.title,
        description: createContestDto.description,
        start_time: new Date(createContestDto.start_time),
        end_time: new Date(createContestDto.end_time),
      },
    });
  }

  async findAll() {
    return this.prisma.contest.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const contest = await this.prisma.contest.findUnique({
      where: { id },
      include: {
        problems: {
          include: {
            problem: {
              select: {
                id: true,
                title: true,
                difficulty: true,
              }
            },
          }
        },
      },
    });

    if (!contest) {
      throw new NotFoundException('Không tìm thấy kỳ thi');
    }

    return contest;
  }

  async update(id: string, updateContestDto: UpdateContestDto) {
    const contest = await this.prisma.contest.findUnique({ where: { id } });
    if (!contest) throw new NotFoundException('Không tìm thấy kỳ thi');

    const updateData: any = { ...updateContestDto };
    if (updateContestDto.start_time) updateData.start_time = new Date(updateContestDto.start_time);
    if (updateContestDto.end_time) updateData.end_time = new Date(updateContestDto.end_time);

    return this.prisma.contest.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    const contest = await this.prisma.contest.findUnique({ where: { id } });
    if (!contest) throw new NotFoundException('Không tìm thấy kỳ thi');

    return this.prisma.contest.delete({
      where: { id },
    });
  }

  async addProblem(contestId: string, addProblemDto: AddProblemDto) {
    const { problem_id } = addProblemDto;

    // Check contest
    const contest = await this.prisma.contest.findUnique({ where: { id: contestId } });
    if (!contest) throw new NotFoundException('Không tìm thấy kỳ thi');

    // Check problem
    const problem = await this.prisma.problem.findUnique({ where: { id: problem_id } });
    if (!problem) throw new NotFoundException('Không tìm thấy bài tập');

    // Check if already exists
    const existing = await this.prisma.contestProblem.findUnique({
      where: {
        contest_id_problem_id: {
          contest_id: contestId,
          problem_id: problem_id,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Bài tập này đã tồn tại trong kỳ thi');
    }

    return this.prisma.contestProblem.create({
      data: {
        contest_id: contestId,
        problem_id: problem_id,
      },
    });
  }
}
