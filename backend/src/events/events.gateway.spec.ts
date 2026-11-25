import { Server, Socket } from 'socket.io';
import { EventsGateway } from './events.gateway';

describe('EventsGateway submission progress replay', () => {
  it('replays the latest progress and terminal status when a client joins late', async () => {
    const gateway = new EventsGateway();
    const socket = {
      id: 'socket-1',
      data: { user: { userId: 'teacher-1', role: 'INSTRUCTOR' } },
      join: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
    } as unknown as Socket;
    const roomEmit = jest.fn();
    gateway.server = {
      to: jest.fn().mockReturnValue({ emit: roomEmit }),
    } as unknown as Server;
    const submissionId = 'submission-1';
    const progress = {
      completed_tests: 3,
      total_tests: 8,
      testcase_index: 2,
    };
    const status = {
      submission_id: submissionId,
      status: 'ACCEPTED',
    };

    gateway.emitSubmissionProgress(submissionId, progress);
    gateway.emitSubmissionUpdate(submissionId, status);
    await gateway.handleJoinSubmission(socket, {
      submission_id: submissionId,
    });

    expect(socket.join).toHaveBeenCalledWith(`submission_${submissionId}`);
    expect(socket.emit).toHaveBeenNthCalledWith(1, 'submission_progress', {
      submission_id: submissionId,
      ...progress,
    });
    expect(socket.emit).toHaveBeenNthCalledWith(
      2,
      'submission_status_changed',
      status,
    );
  });
});

describe('EventsGateway authorization', () => {
  const OLD = process.env.JWT_SECRET;
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-at-least-16-chars';
  });
  afterAll(() => {
    process.env.JWT_SECRET = OLD;
  });

  const makeSocket = (
    user?: { userId: string; role: string },
    token?: string,
  ) =>
    ({
      id: 's',
      data: user ? { user } : {},
      handshake: { auth: token ? { token } : {}, headers: {} },
      join: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
      disconnect: jest.fn(),
    }) as unknown as Socket;

  it('disconnects a socket without a valid token', async () => {
    const jwt = { verifyAsync: jest.fn().mockRejectedValue(new Error('bad')) };
    const gw = new EventsGateway(jwt as any, {} as any);
    const sock = makeSocket(undefined, 'garbage');
    await gw.handleConnection(sock);
    expect(sock.disconnect).toHaveBeenCalledWith(true);
  });

  it('attaches the user from a valid token', async () => {
    const jwt = {
      verifyAsync: jest.fn().mockResolvedValue({ sub: 'u1', role: 'STUDENT' }),
    };
    const gw = new EventsGateway(jwt as any, {} as any);
    const sock = makeSocket(undefined, 'good');
    await gw.handleConnection(sock);
    expect((sock as any).data.user).toEqual({ userId: 'u1', role: 'STUDENT' });
    expect(sock.disconnect).not.toHaveBeenCalled();
  });

  it("blocks a student from joining another student's submission room", async () => {
    const prisma = {
      submission: {
        findUnique: jest.fn().mockResolvedValue({ user_id: 'other' }),
      },
    };
    const gw = new EventsGateway(undefined, prisma as any);
    const sock = makeSocket({ userId: 'u1', role: 'STUDENT' });
    await expect(
      gw.handleJoinSubmission(sock, {
        submission_id: '00000000-0000-0000-0000-000000000001',
      }),
    ).rejects.toBeDefined();
    expect(sock.join).not.toHaveBeenCalled();
  });

  it('blocks students from the contest monitoring room', async () => {
    const gw = new EventsGateway();
    const sock = makeSocket({ userId: 'u1', role: 'STUDENT' });
    await expect(
      gw.handleJoinAdminDashboard(sock, {
        contest_id: '00000000-0000-0000-0000-000000000002',
      }),
    ).rejects.toBeDefined();
  });

  it('joins the notification room of the token user, not a user_id from the client', async () => {
    const gw = new EventsGateway();
    const sock = makeSocket({ userId: 'u1', role: 'STUDENT' });
    await gw.handleJoinUserRoom(sock);
    expect(sock.join).toHaveBeenCalledWith('user_u1');
  });

  it('only lets the owner join a custom run room', async () => {
    const gw = new EventsGateway();
    gw.registerCustomRunSession('sess-1', 'u1');
    await expect(
      gw.handleJoinCustomRun(makeSocket({ userId: 'u2', role: 'STUDENT' }), {
        session_id: 'sess-1',
      }),
    ).rejects.toBeDefined();
    const owner = makeSocket({ userId: 'u1', role: 'STUDENT' });
    await gw.handleJoinCustomRun(owner, { session_id: 'sess-1' });
    expect(owner.join).toHaveBeenCalledWith('custom_run_sess-1');
  });
});

describe('EventsGateway contest presence', () => {
  const contestId = '11111111-1111-4111-8111-111111111111';
  const makeGateway = (session: unknown) => {
    const prisma = { contestSession: { findUnique: jest.fn().mockResolvedValue(session) } };
    const gateway = new EventsGateway(undefined, prisma as never);
    const roomEmit = jest.fn();
    gateway.server = { to: jest.fn().mockReturnValue({ emit: roomEmit }) } as unknown as Server;
    return { gateway, prisma, roomEmit };
  };
  const studentSocket = (id = 'sock-1') =>
    ({ id, data: { user: { userId: 'stu-1', role: 'STUDENT' } }, emit: jest.fn(), join: jest.fn() }) as unknown as Socket;

  it('thí sinh hợp lệ: báo trạng thái cho phòng giám sát, nhịp lặp lại không phát thêm', async () => {
    const { gateway, roomEmit, prisma } = makeGateway({ student: { username: 'an', email: 'an@x.vn', full_name: 'An' } });
    const sock = studentSocket();
    await gateway.handleContestPresence(sock, { contest_id: contestId, state: 'active', problem_id: 'p1' });
    await gateway.handleContestPresence(sock, { contest_id: contestId, state: 'active', problem_id: 'p1' });
    expect(gateway.server.to).toHaveBeenCalledWith(`admin_dashboard_${contestId}`);
    expect(roomEmit).toHaveBeenCalledTimes(1);
    expect(roomEmit).toHaveBeenCalledWith(
      'contest_presence_update',
      expect.objectContaining({ student_id: 'stu-1', state: 'active', problem_id: 'p1', username: 'an' }),
    );
    // lần 2 dùng cache, không hỏi DB nữa
    expect(prisma.contestSession.findUnique).toHaveBeenCalledTimes(1);

    gateway.handleDisconnect(sock);
    expect(roomEmit).toHaveBeenLastCalledWith('contest_presence_update', expect.objectContaining({ state: 'offline' }));
  });

  it('không phải thí sinh của kỳ thi thì bỏ qua', async () => {
    const { gateway, roomEmit } = makeGateway(null);
    await expect(
      gateway.handleContestPresence(studentSocket(), { contest_id: contestId, state: 'active' }),
    ).resolves.toEqual({ success: false });
    expect(roomEmit).not.toHaveBeenCalled();
  });

  it('giảng viên vào phòng giám sát nhận ngay ảnh chụp trạng thái', async () => {
    const { gateway } = makeGateway({ student: { username: 'an', email: 'an@x.vn', full_name: null } });
    await gateway.handleContestPresence(studentSocket(), { contest_id: contestId, state: 'away' });
    const teacher = {
      id: 't', data: { user: { userId: 'gv', role: 'INSTRUCTOR' } }, join: jest.fn(), emit: jest.fn(),
    } as unknown as Socket;
    await gateway.handleJoinAdminDashboard(teacher, { contest_id: contestId });
    expect(teacher.emit).toHaveBeenCalledWith(
      'contest_presence_snapshot',
      expect.objectContaining({ students: [expect.objectContaining({ student_id: 'stu-1', state: 'away' })] }),
    );
  });
});
