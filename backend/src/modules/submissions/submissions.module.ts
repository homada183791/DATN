import { Module } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { QueueModule } from '../queue/queue.module';

import { NotificationsModule } from '../notifications/notifications.module';
import { EventsModule } from '../../events/events.module';
import { WebhookModule } from '../webhook/webhook.module';
import { LocalJudgeService } from './local-judge.service';

@Module({
  imports: [QueueModule, NotificationsModule, EventsModule, WebhookModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, LocalJudgeService],
  exports: [SubmissionsService, LocalJudgeService],
})
export class SubmissionsModule {}
