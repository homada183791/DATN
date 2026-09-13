import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { HomeworksModule } from '../homeworks/homeworks.module';

@Module({
  imports: [PrismaModule, HomeworksModule],
  controllers: [ClassesController],
  providers: [ClassesService],
})
export class ClassesModule {}
