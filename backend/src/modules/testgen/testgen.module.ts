import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { TestGenController } from './testgen.controller';
import { TestGenService } from './testgen.service';

@Module({
  imports: [AiModule],
  controllers: [TestGenController],
  providers: [TestGenService],
})
export class TestGenModule {}
