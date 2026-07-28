import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProblemsModule } from './modules/problems/problems.module';
import { QueueModule } from './modules/queue/queue.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { EventsModule } from './events/events.module';
import { ContestsModule } from './modules/contests/contests.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, ProblemsModule, QueueModule, SubmissionsModule, WebhookModule, EventsModule, ContestsModule, LeaderboardModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
