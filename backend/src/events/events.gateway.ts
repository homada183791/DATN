import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { JoinSubmissionRoomDto } from './dto/join-submission-room.dto';
import { JoinAdminDashboardDto } from './dto/join-admin-dashboard.dto';
import { isAllowedOrigin, requireSecret } from '../common/config/secrets';
import { ContestPresenceTracker, type PresenceEntry } from './contest-presence';

export type SocketUser = { userId: string; role: string };

@WebSocketGateway({
  cors: {
    origin: (origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void) =>
      cb(null, isAllowedOrigin(origin)),
    credentials: true,
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  private static readonly SUBMISSION_SNAPSHOT_TTL_MS = 5 * 60 * 1000;
  private static readonly MAX_SUBMISSION_SNAPSHOTS = 1000;

  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private readonly submissionSnapshots = new Map<
    string,
    {
      progress?: {
        submission_id: string;
        completed_tests: number;
        total_tests: number;
        testcase_index: number;
      };
      status?: Record<string, unknown>;
      expiresAt: number;
    }
  >();

  /** session_id của lần chạy thử -> user sở hữu, để chỉ chủ phiên mới vào được phòng. */
  private readonly customRunOwners = new Map<string, { userId: string; expiresAt: number }>();
  private static readonly CUSTOM_RUN_TTL_MS = 10 * 60 * 1000;

  /** Trạng thái trực tiếp của sinh viên trong kỳ thi (màn hình giám sát). */
  readonly presence = new ContestPresenceTracker(45_000);
  private presenceSweepTimer?: ReturnType<typeof setInterval>;
  /** (kỳ thi|sinh viên) đã kiểm tra là thí sinh hợp lệ, để nhịp 15 giây không phải hỏi DB mỗi lần. */
  private readonly presenceAllowed = new Map<
    string,
    { username: string; full_name: string | null; expiresAt: number }
  >();
  private static readonly PRESENCE_ALLOW_TTL_MS = 10 * 60 * 1000;

  constructor(
    @Optional() private readonly jwtService?: JwtService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  afterInit() {
    this.logger.log('Websocket Gateway Initialized');
    this.presenceSweepTimer = setInterval(() => {
      for (const change of this.presence.sweep()) this.emitPresence(change.contest_id, change.entry);
    }, 15_000);
    this.presenceSweepTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.presenceSweepTimer) clearInterval(this.presenceSweepTimer);
  }

  /** Xác thực JWT ngay khi kết nối; token sai hoặc thiếu thì ngắt kết nối. */
  async handleConnection(client: Socket) {
    try {
      const raw =
        (client.handshake?.auth?.token as string | undefined) ??
        client.handshake?.headers?.authorization;
      const token = raw?.replace(/^Bearer\s+/i, '');
      if (!token || !this.jwtService) throw new Error('missing token');
      const payload = await this.jwtService.verifyAsync<{ sub: string; role: string }>(
        token,
        { secret: requireSecret('JWT_SECRET') },
      );
      (client.data as { user?: SocketUser }).user = {
        userId: payload.sub,
        role: payload.role,
      };
      this.logger.log(`[EventsGateway] Client connected: ${client.id} (user ${payload.sub})`);
    } catch {
      this.logger.warn(`[EventsGateway] Rejected unauthenticated socket ${client.id}`);
      client.emit('auth_error', { message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[EventsGateway] Client disconnected: ${client.id}`);
    for (const change of this.presence.disconnect(client.id)) {
      this.emitPresence(change.contest_id, change.entry);
    }
  }

  private requireUser(client: Socket): SocketUser {
    const user = (client.data as { user?: SocketUser } | undefined)?.user;
    if (!user) throw new WsException({ success: false, message: 'Chưa đăng nhập' });
    return user;
  }

  private isInstructor(user: SocketUser) {
    return user.role === 'INSTRUCTOR' || user.role === 'ADMIN';
  }

  /** Gọi khi tạo một lần chạy thử, để gắn phiên với người tạo. */
  public registerCustomRunSession(sessionId: string, userId: string) {
    const now = Date.now();
    for (const [id, v] of this.customRunOwners) if (v.expiresAt <= now) this.customRunOwners.delete(id);
    this.customRunOwners.set(sessionId, { userId, expiresAt: now + EventsGateway.CUSTOM_RUN_TTL_MS });
  }

  // ─── Submission room ────────────────────────────────────────────────────────

  @SubscribeMessage('join_submission')
  async handleJoinSubmission(
    @ConnectedSocket() client: Socket,
    @MessageBody() joinSubmissionRoomDto: JoinSubmissionRoomDto,
  ) {
    const user = this.requireUser(client);
    const { submission_id } = joinSubmissionRoomDto;
    if (!this.isInstructor(user)) {
      const owner = await this.prisma?.submission.findUnique({
        where: { id: submission_id },
        select: { user_id: true },
      });
      if (!owner || owner.user_id !== user.userId) {
        throw new WsException({ success: false, message: 'Không có quyền xem bài nộp này' });
      }
    }
    const roomName = `submission_${submission_id}`;
    await client.join(roomName);

    const snapshot = this.getSubmissionSnapshot(submission_id);
    if (snapshot?.progress) client.emit('submission_progress', snapshot.progress);
    if (snapshot?.status) client.emit('submission_status_changed', snapshot.status);
    return { success: true, event: 'joined', room: roomName };
  }

  // ─── Admin dashboard room ───────────────────────────────────────────────────

  @SubscribeMessage('join_admin_dashboard')
  async handleJoinAdminDashboard(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinAdminDashboardDto,
  ) {
    const user = this.requireUser(client);
    if (!this.isInstructor(user)) {
      throw new WsException({ success: false, message: 'Chỉ giảng viên được theo dõi kỳ thi' });
    }
    const roomName = `admin_dashboard_${payload.contest_id}`;
    await client.join(roomName);
    // Gửi ngay ảnh chụp trạng thái hiện tại để màn hình giám sát không phải chờ nhịp kế tiếp.
    client.emit('contest_presence_snapshot', {
      contest_id: payload.contest_id,
      server_time: Date.now(),
      students: this.presence.snapshot(payload.contest_id),
    });
    return { success: true, event: 'joined_admin', room: roomName };
  }

  // ─── Contest presence (sinh viên báo trạng thái khi đang thi) ───────────────

  /**
   * Sinh viên đang ở trang làm bài thi gửi trạng thái: khi mở trang, khi chuyển tab/quay lại,
   * khi đổi bài, và nhịp 15 giây/lần. Chỉ thí sinh đã vào kỳ thi mới được ghi nhận.
   */
  @SubscribeMessage('contest_presence')
  async handleContestPresence(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { contest_id?: string; state?: string; problem_id?: string | null },
  ) {
    const user = this.requireUser(client);
    const contestId = typeof payload?.contest_id === 'string' ? payload.contest_id : '';
    const state = payload?.state === 'away' ? 'away' : 'active';
    const problemId =
      typeof payload?.problem_id === 'string' && payload.problem_id.length <= 64 ? payload.problem_id : null;
    if (!/^[0-9a-f-]{36}$/i.test(contestId)) return { success: false };

    const student = await this.resolvePresenceStudent(contestId, user.userId);
    if (!student) return { success: false };

    const changed = this.presence.update(contestId, student, client.id, state, problemId);
    if (changed) this.emitPresence(contestId, changed);
    return { success: true };
  }

  private async resolvePresenceStudent(contestId: string, userId: string) {
    const key = `${contestId}|${userId}`;
    const cached = this.presenceAllowed.get(key);
    const now = Date.now();
    if (cached && cached.expiresAt > now) return { id: userId, ...cached };
    const session = await this.prisma?.contestSession.findUnique({
      where: { contest_id_student_id: { contest_id: contestId, student_id: userId } },
      select: { student: { select: { username: true, email: true, full_name: true } } },
    });
    if (!session) return null;
    const info = {
      username: session.student.username ?? session.student.email.split('@')[0],
      full_name: session.student.full_name ?? null,
      expiresAt: now + EventsGateway.PRESENCE_ALLOW_TTL_MS,
    };
    this.presenceAllowed.set(key, info);
    return { id: userId, ...info };
  }

  private emitPresence(contestId: string, entry: PresenceEntry) {
    try {
      this.server?.to(`admin_dashboard_${contestId}`).emit('contest_presence_update', {
        contest_id: contestId,
        server_time: Date.now(),
        ...entry,
      });
    } catch (error: any) {
      this.logger.error(`[EventsGateway] Error emitting presence: ${error.message}`);
    }
  }

  // ─── Custom run room ────────────────────────────────────────────────────────

  @SubscribeMessage('join_custom_run')
  async handleJoinCustomRun(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { session_id: string },
  ) {
    const user = this.requireUser(client);
    const owner = this.customRunOwners.get(payload?.session_id);
    if (!owner || owner.expiresAt <= Date.now() || owner.userId !== user.userId) {
      throw new WsException({ success: false, message: 'Phiên chạy thử không hợp lệ' });
    }
    const roomName = `custom_run_${payload.session_id}`;
    await client.join(roomName);
    return { success: true, event: 'joined_custom_run', room: roomName };
  }

  // ─── Per-user notification room ─────────────────────────────────────────────
  /** Mỗi socket chỉ vào được phòng thông báo của chính mình (lấy từ JWT, bỏ qua user_id gửi lên). */
  @SubscribeMessage('join_user_room')
  async handleJoinUserRoom(@ConnectedSocket() client: Socket) {
    const user = this.requireUser(client);
    const roomName = `user_${user.userId}`;
    await client.join(roomName);
    return { success: true, event: 'joined_user_room', room: roomName };
  }

  // ─── Emit helpers ───────────────────────────────────────────────────────────

  public emitSubmissionUpdate(submission_id: string, payload: any) {
    try {
      this.updateSubmissionSnapshot(submission_id, { status: payload });
      const roomName = `submission_${submission_id}`;
      this.server.to(roomName).emit('submission_status_changed', payload);
      this.logger.log(
        `[EventsGateway] Emitted status update to room ${roomName}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[EventsGateway] Error emitting update: ${error.message}`,
      );
    }
  }

  public emitSubmissionProgress(
    submission_id: string,
    payload: { completed_tests: number; total_tests: number; testcase_index: number },
  ) {
    try {
      this.updateSubmissionSnapshot(submission_id, {
        progress: { submission_id, ...payload },
      });
      this.server
        .to(`submission_${submission_id}`)
        .emit('submission_progress', { submission_id, ...payload });
    } catch (error: any) {
      this.logger.error(
        `[EventsGateway] Error emitting submission progress: ${error.message}`,
      );
    }
  }

  private getSubmissionSnapshot(submission_id: string) {
    const snapshot = this.submissionSnapshots.get(submission_id);
    if (snapshot && snapshot.expiresAt <= Date.now()) {
      this.submissionSnapshots.delete(submission_id);
      return undefined;
    }
    return snapshot;
  }

  private updateSubmissionSnapshot(
    submission_id: string,
    update: {
      progress?: {
        submission_id: string;
        completed_tests: number;
        total_tests: number;
        testcase_index: number;
      };
      status?: Record<string, unknown>;
    },
  ) {
    const previous = this.getSubmissionSnapshot(submission_id);
    this.submissionSnapshots.delete(submission_id);
    this.submissionSnapshots.set(submission_id, {
      ...previous,
      ...update,
      expiresAt: Date.now() + EventsGateway.SUBMISSION_SNAPSHOT_TTL_MS,
    });

    while (
      this.submissionSnapshots.size > EventsGateway.MAX_SUBMISSION_SNAPSHOTS
    ) {
      const oldestSubmissionId = this.submissionSnapshots.keys().next().value;
      if (!oldestSubmissionId) break;
      this.submissionSnapshots.delete(oldestSubmissionId);
    }
  }

  public emitAdminDashboardUpdate(contest_id: string, payload: any) {
    try {
      const roomName = `admin_dashboard_${contest_id}`;
      this.server.to(roomName).emit('admin_contest_update', payload);
      this.logger.log(
        `[EventsGateway] Emitted admin update to room ${roomName}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[EventsGateway] Error emitting admin update: ${error.message}`,
      );
    }
  }

  public emitLeaderboardUpdate(payload: { contest_id: string; user_id?: string; status?: string }) {
    try {
      this.server.emit('leaderboard_updated', payload);
      this.logger.log(
        `[EventsGateway] Emitted leaderboard_updated for contest ${payload.contest_id}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[EventsGateway] Error emitting leaderboard update: ${error.message}`,
      );
    }
  }

  public emitCustomRunResult(sessionId: string, payload: any) {
    try {
      const roomName = `custom_run_${sessionId}`;
      this.server.to(roomName).emit('custom_run_result', payload);
      this.logger.log(
        `[EventsGateway] Emitted custom run result to room ${roomName}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[EventsGateway] Error emitting custom run result: ${error.message}`,
      );
    }
  }

  public emitCheatWarning(contest_id: string, payload: any) {
    try {
      const roomName = `admin_dashboard_${contest_id}`;
      this.server.to(roomName).emit('cheat_warning', payload);
      this.logger.log(
        `[EventsGateway] Emitted cheat warning to room ${roomName}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[EventsGateway] Error emitting cheat warning: ${error.message}`,
      );
    }
  }

  /**
   * Push thông báo real-time đến room của 1 user cụ thể.
   */
  public emitNotification(userId: string, notification: any) {
    try {
      const roomName = `user_${userId}`;
      this.server.to(roomName).emit('notification_received', notification);
      this.logger.log(
        `[EventsGateway] Pushed notification to room ${roomName}: ${notification.title}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[EventsGateway] Error emitting notification: ${error.message}`,
      );
    }
  }
}
