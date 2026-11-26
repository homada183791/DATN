import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserThrottlerGuard } from './common/guards/user-throttler.guard';
import { ProblemsModule } from './modules/problems/problems.module';
import { QueueModule } from './modules/queue/queue.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { EventsModule } from './events/events.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { ContestsModule } from './modules/contests/contests.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { ClassesModule } from './modules/classes/classes.module';
import { PlagiarismModule } from './modules/plagiarism/plagiarism.module';
import { HomeworksModule } from './modules/homeworks/homeworks.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AiModule } from './modules/ai/ai.module';
import { SkillsModule } from './modules/skills/skills.module';
import { SandboxModule } from './modules/sandbox/sandbox.module';
import { TestGenModule } from './modules/testgen/testgen.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Mặc định: 300 request/phút cho mỗi người dùng trên mỗi route. Route nhạy cảm đặt riêng bằng @Throttle.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    PrismaModule,
    UsersModule,
    AuthModule,
    ProblemsModule,
    QueueModule,
    SubmissionsModule,
    WebhookModule,
    EventsModule,
    ContestsModule,
    LeaderboardModule,
    ClassesModule,
    PlagiarismModule,
    HomeworksModule,
    NotificationsModule,
    AiModule,
    SkillsModule,
    SandboxModule,
    TestGenModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: UserThrottlerGuard }],
})
export class AppModule {}
