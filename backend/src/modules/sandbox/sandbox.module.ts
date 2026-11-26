import { Global, Module } from '@nestjs/common';
import { SandboxBatchService } from './sandbox-batch.service';

@Global()
@Module({
  providers: [SandboxBatchService],
  exports: [SandboxBatchService],
})
export class SandboxModule {}
