import { Module } from '@nestjs/common';
import { ContestsService } from './contests.service';
import { ContestsController } from './contests.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { EventsModule } from '../../events/events.module';

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [ContestsController],
  providers: [ContestsService],
})
export class ContestsModule {}
