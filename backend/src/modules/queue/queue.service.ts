import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(@Inject('RABBITMQ_SERVICE') private readonly client: ClientProxy) {}

  publishJudgeJob(payload: any) {
    try {
      // emit gửi message lên queue, pattern là 'judge_job'
      this.client.emit('judge_job', payload);
      this.logger.log(`[RabbitMQ] Published job to judge_queue: ${JSON.stringify(payload)}`);
      return true;
    } catch (error) {
      this.logger.error(`[RabbitMQ] Failed to publish job: ${error.message}`, error.stack);
      // Lỗi RabbitMQ không làm gián đoạn luồng HTTP chính
      return false;
    }
  }
}
