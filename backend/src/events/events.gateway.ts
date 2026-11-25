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
import { Logger, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { JoinSubmissionRoomDto } from './dto/join-submission-room.dto';
import { JoinAdminDashboardDto } from './dto/join-admin-dashboard.dto';
import { isAllowedOrigin, requireSecret } from '../common/config/secrets';

export type SocketUser = { userId: string; role: string };

@WebSocketGateway({
  cors: {
    origin: (origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void) =>
      cb(null, isAllowedOrigin(origin)),
    credentials: true,
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
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

  constructor(
    @Optional() private readonly jwtService?: JwtService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  afterInit() {
    this.logger.log('Websocket Gateway Initialized');
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
    return { success: true, event: 'joined_admin', room: roomName };
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
