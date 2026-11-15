import { ContestsService } from './contests.service';
import { EventsGateway } from '../../events/events.gateway';
import { PrismaService } from '../../prisma/prisma.service';

describe('ContestsService.joinContest', () => {
  it('returns the session created by a concurrent join after a unique conflict', async () => {
    const contestId = 'contest-1';
    const studentId = 'student-1';
    const session = {
      id: 'session-1',
      cheat_warnings: 1,
      is_disqualified: false,
    };
    const prisma = {
      contest: {
        findUnique: jest.fn().mockResolvedValue({
          id: contestId,
          end_time: new Date('2026-11-14T00:00:00.000Z'),
          max_cheat_warnings: 3,
          lockdown_enabled: false,
        }),
      },
      contestSession: {
        upsert: jest
          .fn()
          .mockRejectedValue(
            Object.assign(new Error('duplicate key'), { code: 'P2002' }),
          ),
        findUnique: jest.fn().mockResolvedValue(session),
      },
    };
    const service = new ContestsService(
      prisma as unknown as PrismaService,
      {} as EventsGateway,
    );

    await expect(service.joinContest(contestId, studentId)).resolves.toEqual({
      success: true,
      session_id: session.id,
      cheat_warnings: session.cheat_warnings,
      is_disqualified: session.is_disqualified,
      max_warnings: 3,
      lockdown_enabled: false,
      end_time: new Date('2026-11-14T00:00:00.000Z'),
    });
    expect(prisma.contestSession.findUnique).toHaveBeenCalledWith({
      where: {
        contest_id_student_id: {
          contest_id: contestId,
          student_id: studentId,
        },
      },
    });
  });
});
