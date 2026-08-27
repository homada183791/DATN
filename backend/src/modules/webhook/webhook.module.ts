import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { EventsModule } from '../../events/events.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, EventsModule, UsersModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
