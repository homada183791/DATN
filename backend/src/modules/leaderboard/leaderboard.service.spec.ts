import { SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LeaderboardService } from './leaderboard.service';

describe('LeaderboardService', () => {
  let service: LeaderboardService;

  afterEach(async () => {
    if (service) {
      await service.onModuleDestroy();
    }
  });

  it('falls back to database when Redis is unavailable for getLeaderboard and getDetailedResults', async () => {
    const start = new Date('2026-11-28T01:00:00.000Z');
    const end = new Date('2026-11-28T03:00:00.000Z');
    const prisma = {
      contest: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'contest-1',
          title: 'Final Contest',
          start_time: start,
          end_time: end,
          lockdown_enabled: false,
          max_cheat_warnings: 3,
          problems: [
            {
              problem_id: 'prob-1',
              problem: { id: 'prob-1', title: 'Add Two Numbers' },
            },
          ],
        }),
      },
      submission: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'sub-1',
            user_id: 'user-1',
            problem_id: 'prob-1',
            status: SubmissionStatus.ACCEPTED,
            score: 100,
            instructor_score: null,
            execution_time: 12,
            created_at: new Date('2026-11-28T01:15:00.000Z'),
            user: {
              id: 'user-1',
              email: 'student@example.com',
              username: 'student',
            },
          },
        ]),
      },
      contestSession: {
        findMany: jest.fn().mockResolvedValue([
          {
            student_id: 'user-1',
            cheat_warnings: 0,
            is_disqualified: false,
            student: {
              id: 'user-1',
              email: 'student@example.com',
              username: 'student',
            },
          },
        ]),
      },
    };

    service = new LeaderboardService(prisma as unknown as PrismaService);
    (service as unknown as { redisClient: { disconnect: () => void } }).redisClient.disconnect();

    // Simulate offline Redis rejecting all cache commands immediately
    (service as unknown as { redisClient: Record<string, unknown> }).redisClient = {
      status: 'reconnecting',
      get: jest.fn().mockRejectedValue(new Error('Redis offline')),
      setex: jest.fn().mockRejectedValue(new Error('Redis offline')),
      del: jest.fn().mockRejectedValue(new Error('Redis offline')),
      quit: jest.fn().mockResolvedValue('OK'),
      disconnect: jest.fn(),
    };

    const leaderboard = await service.getLeaderboard('contest-1');
    expect(leaderboard).toHaveLength(1);
    expect(leaderboard[0]).toMatchObject({
      rank: 1,
      user_id: 'user-1',
      solved: 1,
      score: 100,
      runtime: 12,
    });

    const detailed = await service.getDetailedResults('contest-1');
    expect(detailed.problems).toEqual([{ id: 'prob-1', title: 'Add Two Numbers' }]);
    expect(detailed.results).toHaveLength(1);
    expect(detailed.results[0].problems['prob-1']).toMatchObject({
      attempts: 1,
      score: 100,
      solved: true,
      solved_at_minutes: 15,
      latest_submission_id: 'sub-1',
    });
  });
});
