import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiProvider } from './ai-provider';

@Module({
  controllers: [AiController],
  providers: [AiService, AiProvider],
  exports: [AiService, AiProvider],
})
export class AiModule {}
