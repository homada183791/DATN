import { Module } from '@nestjs/common';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { AiProvider } from '../ai/ai-provider';

@Module({
  controllers: [SkillsController],
  providers: [SkillsService, AiProvider],
  exports: [SkillsService],
})
export class SkillsModule {}
