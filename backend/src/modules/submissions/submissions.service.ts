import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { Role, SubmissionStatus } from '@prisma/client';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async findAll(userId: string, userRole: Role) {
    const submissions = await this.prisma.submission.findMany({
      where: userRole === Role.INSTRUCTOR ? undefined : { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        problem: { select: { id: true, title: true } },
        user: { select: { id: true, email: true } },
      },
    });

    return submissions.map((submission) => ({
      id: submission.id,
      problem_id: submission.problem_id,
      problem_title: submission.problem.title,
      user_id: submission.user_id,
      username: submission.user.email.split('@')[0],
      language: submission.language,
      status: submission.status,
      execution_time: submission.execution_time,
      memory_used: submission.memory_used,
      source_code: submission.source_code,
      created_at: submission.created_at,
    }));
  }

  async submitCode(userId: string, createSubmissionDto: CreateSubmissionDto) {
    const { problem_id, language, source_code } = createSubmissionDto;

    // B1: Kiểm tra problem_id có tồn tại
    const problem = await this.prisma.problem.findUnique({
      where: { id: problem_id },
    });

    if (!problem) {
      throw new NotFoundException('Không tìm thấy bài tập với mã cung cấp.');
    }

    // B2: Tạo bản ghi Submission mới với status mặc định PENDING
    const submission = await this.prisma.submission.create({
      data: {
        user_id: userId,
        problem_id: problem.id,
        language,
        source_code,
        status: SubmissionStatus.PENDING,
      },
    });

    // B3: Tạo payload gửi vào Queue
    const payload = {
      submission_id: submission.id,
      problem_id: problem.id,
      language: submission.language,
      source_code: submission.source_code,
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
}
