import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProblemsModule } from './modules/problems/problems.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, ProblemsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
