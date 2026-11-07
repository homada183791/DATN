import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @Inject('RABBITMQ_SERVICE') private readonly client: ClientProxy,
  ) {}

  async publishJudgeJob(payload: any): Promise<boolean> {
    try {
      // emit gửi message lên queue, pattern là 'judge_job'
      await firstValueFrom(
        this.client.emit('judge_job', payload).pipe(timeout({ first: 3000 })),
      );
      this.logger.log(
        `[RabbitMQ] Published job to judge_queue: ${JSON.stringify(payload)}`,
      );
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
