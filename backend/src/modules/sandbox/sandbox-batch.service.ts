import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { QueueService } from '../queue/queue.service';

export interface BatchItem {
  status: 'OK' | 'TIME_LIMIT_EXCEEDED' | 'RUNTIME_ERROR';
  stdout: string;
  stderr: string;
  execution_time: number;
}

export interface BatchResult {
  compile_error?: string;
  error?: string;
  results: BatchItem[];
}

export interface BatchRequest {
  language: string;
  language_version?: string;
  source_code: string;
  inputs: string[];
  time_limit_ms: number;
  memory_limit_mb?: number;
}

/**
 * Gửi một lượt "chạy chương trình trên nhiều input" sang judge-runner qua RabbitMQ và chờ kết quả
 * (judge-runner trả về qua webhook /webhook/judge/batch). Dùng cho sinh test có kiểm chứng.
 * Backend chạy một tiến trình nên giữ các lượt đang chờ trong bộ nhớ.
 */
@Injectable()
export class SandboxBatchService {
  private readonly logger = new Logger(SandboxBatchService.name);
  private readonly pending = new Map<
    string,
    { resolve: (r: BatchResult) => void; timer: ReturnType<typeof setTimeout> }
  >();

  constructor(private readonly queue: QueueService) {}

  async run(req: BatchRequest, timeoutMs = 180_000): Promise<BatchResult> {
    if (req.inputs.length === 0) return { results: [] };
    const batch_id = randomUUID();
    const result = new Promise<BatchResult>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(batch_id);
        resolve({ error: 'Máy chấm không phản hồi (quá thời gian chờ).', results: [] });
      }, timeoutMs);
      this.pending.set(batch_id, { resolve, timer });
    });
    const ok = await this.queue.publishJudgeJob({ is_batch: true, batch_id, ...req });
    if (!ok) {
      const p = this.pending.get(batch_id);
      if (p) clearTimeout(p.timer);
      this.pending.delete(batch_id);
      throw new ServiceUnavailableException('Không gửi được việc sang máy chấm (RabbitMQ).');
    }
    return result;
  }

  /** Gọi từ webhook khi judge-runner trả kết quả. */
  complete(batchId: string, result: BatchResult) {
    const p = this.pending.get(batchId);
    if (!p) {
      this.logger.warn(`[Batch] Kết quả cho lượt không còn chờ: ${batchId}`);
      return false;
    }
    clearTimeout(p.timer);
    this.pending.delete(batchId);
    p.resolve({
      compile_error: result.compile_error,
      error: result.error,
      results: Array.isArray(result.results) ? result.results : [],
    });
    return true;
  }
}
