import { JudgeRequeueService } from './judge-requeue.service';

describe('JudgeRequeueService', () => {
  const sub = (id: string) => ({
    id,
    problem_id: 'p1',
    language: 'CPP',
    language_version: null,
    source_code: 'int main(){}',
    problem: { time_limit: 1000, memory_limit: 256, test_cases: [] },
  });

  function setup(publishResults: boolean[]) {
    const prisma = {
      submission: {
        findMany: jest.fn().mockResolvedValue([sub('a'), sub('b'), sub('c')]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const queue = {
      publishJudgeJob: jest.fn(),
    };
    publishResults.forEach((r) =>
      queue.publishJudgeJob.mockResolvedValueOnce(r),
    );
    const svc = new JudgeRequeueService(prisma as any, queue as any);
    return { svc, prisma, queue };
  }

  it('re-publishes stuck PENDING submissions and marks them IN_QUEUE', async () => {
    const { svc, prisma, queue } = setup([true, true, true]);
    const n = await svc.requeueStuckSubmissions(
      new Date('2026-11-25T12:00:00Z'),
    );
    expect(n).toBe(3);
    expect(queue.publishJudgeJob).toHaveBeenCalledTimes(3);
    expect(prisma.submission.updateMany).toHaveBeenCalledWith({
      where: { id: 'a', status: 'PENDING' },
      data: { status: 'IN_QUEUE' },
    });
    const where = prisma.submission.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('PENDING');
  });

  it('stops at the first failed publish and leaves the rest PENDING', async () => {
    const { svc, prisma, queue } = setup([true, false]);
    const n = await svc.requeueStuckSubmissions();
    expect(n).toBe(1);
    expect(queue.publishJudgeJob).toHaveBeenCalledTimes(2);
    expect(prisma.submission.updateMany).toHaveBeenCalledTimes(1);
  });
});
