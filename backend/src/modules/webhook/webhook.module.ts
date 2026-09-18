import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { EventsModule } from '../../events/events.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, EventsModule, UsersModule, NotificationsModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}

