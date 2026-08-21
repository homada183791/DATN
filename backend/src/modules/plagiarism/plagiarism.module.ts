import { Module } from '@nestjs/common';
import { PlagiarismService } from './plagiarism.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PlagiarismController } from './plagiarism.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PlagiarismController],
  providers: [PlagiarismService]
})
export class PlagiarismModule {}
