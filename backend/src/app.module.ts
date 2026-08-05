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
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [{
          ttl: 60000,
          limit: 60,
        }],
        storage: new ThrottlerStorageRedisService(process.env.REDIS_URL || 'redis://localhost:6379'),
      }),
    }),
    PrismaModule, 
    UsersModule, 
    AuthModule, 
    ProblemsModule, 
    QueueModule, 
    SubmissionsModule, 
    WebhookModule, 
    EventsModule, 
    ContestsModule, 
    LeaderboardModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
