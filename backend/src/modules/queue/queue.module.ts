import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { QueueService } from './queue.service';

@Global()
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'RABBITMQ_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [
            process.env.RABBITMQ_URL ||
              'amqp://root:rootpassword@localhost:5672',
          ],
          queue: 'judge_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  providers: [QueueService],
  exports: [QueueService, ClientsModule],
})
export class QueueModule {}
