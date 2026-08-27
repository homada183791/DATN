import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlagiarismService {
  private readonly logger = new Logger(PlagiarismService.name);

  constructor(private readonly prisma: PrismaService) { }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkPlagiarism() {
    this.logger.log('[CronJob] Bắt đầu quét đạo văn cho các kỳ thi đã kết thúc...');

    const now = new Date();
    // Tìm các kỳ thi đã kết thúc và chưa được quét đạo văn
    const contestsToProcess = await this.prisma.contest.findMany({
      where: {
        end_time: { lt: now },
        is_plagiarism_checked: false,
      },
      include: {
        problems: {
          include: {
            problem: true
          }
        }
      }
    });

    if (contestsToProcess.length === 0) {
      this.logger.log('[CronJob] Không có kỳ thi nào cần quét.');
      return;
    }

    for (const contest of contestsToProcess) {
      this.logger.log(`Đang quét kỳ thi: ${contest.title} (ID: ${contest.id})`);

      for (const cp of contest.problems) {
        // Lấy tất cả bài nộp ACCEPTED của bài tập này trong thời gian kỳ thi
        const submissions = await this.prisma.submission.findMany({
          where: {
            problem_id: cp.problem_id,
            status: 'ACCEPTED',
            created_at: {
              gte: contest.start_time,
              lte: contest.end_time
            }
          }
        });

        // Nhóm các bài nộp theo user_id, chỉ lấy bài nộp cuối cùng của mỗi sinh viên
        const latestSubmissionsMap = new Map();
        for (const sub of submissions) {
          if (!latestSubmissionsMap.has(sub.user_id) || sub.created_at > latestSubmissionsMap.get(sub.user_id).created_at) {
            latestSubmissionsMap.set(sub.user_id, sub);
          }
        }

        const uniqueSubmissions = Array.from(latestSubmissionsMap.values());

        // So sánh chéo (O(N^2) các sinh viên)
        const reportsToInsert = [];
        for (let i = 0; i < uniqueSubmissions.length; i++) {
          for (let j = i + 1; j < uniqueSubmissions.length; j++) {
            const sub1 = uniqueSubmissions[i];
            const sub2 = uniqueSubmissions[j];

            const simScore = this.calculateSimilarity(sub1.source_code, sub2.source_code);

            if (simScore > 80) { // Ngưỡng 80%
              reportsToInsert.push({
                contest_id: contest.id,
                problem_id: cp.problem_id,
                submission_1_id: sub1.id,
                submission_2_id: sub2.id,
                similarity_score: simScore,
              });
              this.logger.warn(`[Plagiarism] Cảnh báo: ${sub1.id} & ${sub2.id} giống nhau ${simScore.toFixed(2)}%`);
            }
          }
        }

        if (reportsToInsert.length > 0) {
          await this.prisma.plagiarismReport.createMany({
            data: reportsToInsert,
          });
        }
      }

      // Đánh dấu kỳ thi đã quét xong
      await this.prisma.contest.update({
        where: { id: contest.id },
        data: { is_plagiarism_checked: true }
      });
      this.logger.log(`[CronJob] Hoàn tất quét kỳ thi: ${contest.id}`);
    }
  }

  // Thuật toán so sánh chuỗi (Jaccard Similarity trên Trigrams)
  // Chọn thuật toán O(N) để không làm block Event Loop khi code quá dài
  private calculateSimilarity(code1: string, code2: string): number {
    // Loại bỏ toàn bộ khoảng trắng, tab, xuống dòng để so sánh phần core
    const s1 = code1.replace(/\s+/g, '').trim();
    const s2 = code2.replace(/\s+/g, '').trim();

    if (s1.length === 0 && s2.length === 0) return 100;
    if (s1.length < 3 || s2.length < 3) return s1 === s2 ? 100 : 0;

    const getTrigrams = (str: string) => {
      const set = new Set<string>();
      for (let i = 0; i < str.length - 2; i++) {
        set.add(str.substring(i, i + 3));
      }
      return set;
    };

    const set1 = getTrigrams(s1);
    const set2 = getTrigrams(s2);

    let intersectionCount = 0;
    for (const item of set1) {
      if (set2.has(item)) {
        intersectionCount++;
      }
    }

    const unionCount = set1.size + set2.size - intersectionCount;
    if (unionCount === 0) return 100;

    return (intersectionCount / unionCount) * 100;
  }
}
