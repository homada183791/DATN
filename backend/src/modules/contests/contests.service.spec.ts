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

describe('ContestsService.reportCheatWarning', () => {
  it('lưu lần vi phạm kèm lý do và báo màn hình giám sát', async () => {
    const createdAt = new Date('2026-11-26T03:00:00.000Z');
    const prisma = {
      contest: {
        findUnique: jest.fn().mockResolvedValue({ id: 'c1', max_cheat_warnings: 3, lockdown_enabled: false }),
      },
      contestSession: {
        upsert: jest.fn().mockResolvedValue({
          id: 'sess', cheat_warnings: 2, is_disqualified: false,
          student: { email: 'an@x.vn', username: 'an' },
        }),
        update: jest.fn(),
      },
      contestViolation: {
        create: jest.fn().mockResolvedValue({ id: 'v1', created_at: createdAt }),
      },
    };
    const gateway = { emitAdminDashboardUpdate: jest.fn() };
    const service = new ContestsService(prisma as unknown as PrismaService, gateway as unknown as EventsGateway);

    const res = await service.reportCheatWarning('c1', 's1', { reason: 'TAB_HIDDEN', problem_id: 'p1' });

    expect(res).toMatchObject({ cheat_warnings: 2, is_disqualified: false, max_warnings: 3 });
    expect(prisma.contestViolation.create).toHaveBeenCalledWith({
      data: { contest_id: 'c1', student_id: 's1', reason: 'TAB_HIDDEN', problem_id: 'p1', warnings_after: 2 },
    });
    expect(gateway.emitAdminDashboardUpdate).toHaveBeenCalledWith('c1', expect.objectContaining({
      reason: 'TAB_HIDDEN', problem_id: 'p1', violation_id: 'v1', at: createdAt.toISOString(),
    }));
  });

  it('thiếu lý do thì ghi OTHER; ghi nhật ký lỗi vẫn cảnh báo bình thường', async () => {
    const prisma = {
      contest: { findUnique: jest.fn().mockResolvedValue({ id: 'c1', max_cheat_warnings: 3, lockdown_enabled: false }) },
      contestSession: {
        upsert: jest.fn().mockResolvedValue({ id: 'sess', cheat_warnings: 3, is_disqualified: false, student: { email: 'an@x.vn', username: null } }),
        update: jest.fn(),
      },
      contestViolation: { create: jest.fn().mockRejectedValue(new Error('db down')) },
    };
    const gateway = { emitAdminDashboardUpdate: jest.fn() };
    const service = new ContestsService(prisma as unknown as PrismaService, gateway as unknown as EventsGateway);
    const res = await service.reportCheatWarning('c1', 's1');
    expect(res.is_disqualified).toBe(true);
    expect(prisma.contestViolation.create.mock.calls[0][0].data.reason).toBe('OTHER');
    expect(gateway.emitAdminDashboardUpdate).toHaveBeenCalledWith('c1', expect.objectContaining({ reason: 'OTHER', is_disqualified: true }));
  });
});
