import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionStatus } from '@prisma/client';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async submitCode(userId: string, createSubmissionDto: CreateSubmissionDto) {
    const { problem_id, language, source_code } = createSubmissionDto;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    // B1: Kiểm tra problem_id có tồn tại
    const problem = await this.prisma.problem.findUnique({
      where: { id: problem_id },
      include: {
        contests: {
          include: { contest: true }
        }
      }
    });

    if (!problem) {
      throw new NotFoundException('Không tìm thấy bài tập với mã cung cấp.');
    }

    // RÀNG BUỘC KỲ THI (Nếu là STUDENT)
    if (user.role === 'STUDENT' && problem.contests.length > 0) {
      const now = new Date();
      for (const cp of problem.contests) {
        const contest = cp.contest;
        
        // 1. Kiểm tra Private Contest
        if (contest.is_private && contest.class_id) {
          const isMember = await this.prisma.classStudent.findUnique({
            where: {
              class_id_student_id: {
                class_id: contest.class_id,
                student_id: userId
              }
            }
          });
          if (!isMember) {
            throw new ForbiddenException('Bạn không có quyền nộp bài cho bài tập thuộc lớp học khác.');
          }
        }

        // 2. Kiểm tra Thời gian thi
        if (now < contest.start_time) {
          throw new BadRequestException('Kỳ thi chưa bắt đầu, không thể nộp bài.');
        }
        if (now > contest.end_time) {
          throw new BadRequestException('Kỳ thi đã kết thúc, không thể nộp bài.');
        }
      }
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
