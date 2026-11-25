import { Module } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { QueueModule } from '../queue/queue.module';

import { NotificationsModule } from '../notifications/notifications.module';
import { EventsModule } from '../../events/events.module';
import { JudgeRequeueService } from './judge-requeue.service';

@Module({
  imports: [QueueModule, NotificationsModule, EventsModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, JudgeRequeueService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
