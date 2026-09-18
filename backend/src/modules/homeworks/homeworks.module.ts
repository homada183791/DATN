import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { HomeworksController } from './homeworks.controller';
import { HomeworksService } from './homeworks.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsModule } from '../../events/events.module';

@Module({
  imports: [PrismaModule, NotificationsModule, EventsModule],
  controllers: [HomeworksController],
  providers: [HomeworksService],
  exports: [HomeworksService],
})
export class HomeworksModule {}