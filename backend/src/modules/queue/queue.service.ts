import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @Inject('RABBITMQ_SERVICE') private readonly client: ClientProxy,
  ) {}

  /** Tóm tắt job để ghi log, bỏ nội dung nhạy cảm. */
  static describe(payload: any): string {
    const id = payload?.submission_id ?? payload?.session_id ?? payload?.batch_id ?? 'unknown';
    const kind = payload?.is_batch ? 'batch-run' : payload?.is_custom ? 'custom-run' : 'submission';
    const tests = Array.isArray(payload?.test_cases)
      ? payload.test_cases.length
      : Array.isArray(payload?.inputs)
        ? payload.inputs.length
        : 0;
    return `${kind} ${id} lang=${payload?.language ?? '?'} tests=${tests}`;
  }

  async publishJudgeJob(payload: any): Promise<boolean> {
    try {
      // emit gửi message lên queue, pattern là 'judge_job'
      await firstValueFrom(
        this.client.emit('judge_job', payload).pipe(timeout({ first: 3000 })),
      );
      // Không ghi source code hay test case (kể cả test ẩn) vào log.
      this.logger.log(`[RabbitMQ] Published job: ${QueueService.describe(payload)}`);
      return true;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `[RabbitMQ] Failed to publish job: ${message}`,
        stack,
      );
      // Lỗi RabbitMQ không làm gián đoạn luồng HTTP chính
      return false;
    }
  }
}
