import { SandboxBatchService } from './sandbox-batch.service';

describe('SandboxBatchService', () => {
  it('gửi việc is_batch qua hàng đợi và trả kết quả khi webhook gọi complete', async () => {
    const queue: any = { publishJudgeJob: jest.fn().mockResolvedValue(true) };
    const svc = new SandboxBatchService(queue);
    const p = svc.run({ language: 'PYTHON', source_code: 'print(1)', inputs: ['1\n'], time_limit_ms: 1000 });
    await Promise.resolve();
    const payload = queue.publishJudgeJob.mock.calls[0][0];
    expect(payload).toMatchObject({ is_batch: true, inputs: ['1\n'] });
    expect(svc.complete(payload.batch_id, { results: [{ status: 'OK', stdout: '1\n', stderr: '', execution_time: 3 }] })).toBe(true);
    await expect(p).resolves.toMatchObject({ results: [{ stdout: '1\n' }] });
    expect(svc.complete(payload.batch_id, { results: [] })).toBe(false);
  });

  it('hết giờ chờ thì trả lỗi thay vì treo', async () => {
    const svc = new SandboxBatchService({ publishJudgeJob: jest.fn().mockResolvedValue(true) } as any);
    await expect(svc.run({ language: 'C', source_code: 'x', inputs: ['a'], time_limit_ms: 1 }, 20)).resolves.toMatchObject({
      error: expect.stringContaining('quá thời gian'),
    });
  });

  it('báo lỗi khi không gửi được sang RabbitMQ', async () => {
    const svc = new SandboxBatchService({ publishJudgeJob: jest.fn().mockResolvedValue(false) } as any);
    await expect(svc.run({ language: 'C', source_code: 'x', inputs: ['a'], time_limit_ms: 1 })).rejects.toThrow('RabbitMQ');
  });
});
