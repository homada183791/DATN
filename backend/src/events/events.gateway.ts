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
import { Logger } from '@nestjs/common';
import { JoinSubmissionRoomDto } from './dto/join-submission-room.dto';
import { JoinAdminDashboardDto } from './dto/join-admin-dashboard.dto';

@WebSocketGateway({ cors: { origin: '*' } })
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

  afterInit(server: Server) {
    this.logger.log('Websocket Gateway Initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`[EventsGateway] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[EventsGateway] Client disconnected: ${client.id}`);
  }

  // ─── Submission room ────────────────────────────────────────────────────────

  @SubscribeMessage('join_submission')
  async handleJoinSubmission(
    @ConnectedSocket() client: Socket,
    @MessageBody() joinSubmissionRoomDto: JoinSubmissionRoomDto,
  ) {
    try {
      const { submission_id } = joinSubmissionRoomDto;
      const roomName = `submission_${submission_id}`;
      await client.join(roomName);
      this.logger.log(
        `[EventsGateway] Client ${client.id} joined room ${roomName}`,
      );

      const snapshot = this.getSubmissionSnapshot(submission_id);
      if (snapshot?.progress) {
        client.emit('submission_progress', snapshot.progress);
      }
      if (snapshot?.status) {
        client.emit('submission_status_changed', snapshot.status);
      }

      return { success: true, event: 'joined', room: roomName };
    } catch (error: any) {
      this.logger.error(`[EventsGateway] Error joining room: ${error.message}`);
      throw new WsException({ success: false, message: error.message });
    }
  }

  // ─── Admin dashboard room ───────────────────────────────────────────────────

  @SubscribeMessage('join_admin_dashboard')
  handleJoinAdminDashboard(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinAdminDashboardDto,
  ) {
    try {
      const roomName = `admin_dashboard_${payload.contest_id}`;
      client.join(roomName);
      this.logger.log(
        `[EventsGateway] Admin ${client.id} joined dashboard for contest ${payload.contest_id}`,
      );
      return { success: true, event: 'joined_admin', room: roomName };
    } catch (error: any) {
      this.logger.error(
        `[EventsGateway] Error joining admin room: ${error.message}`,
      );
      throw new WsException({ success: false, message: error.message });
    }
  }

  // ─── Custom run room ────────────────────────────────────────────────────────

  @SubscribeMessage('join_custom_run')
  handleJoinCustomRun(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { session_id: string },
  ) {
    try {
      const roomName = `custom_run_${payload.session_id}`;
      client.join(roomName);
      this.logger.log(
        `[EventsGateway] Client ${client.id} joined custom run room ${roomName}`,
      );
      return { success: true, event: 'joined_custom_run', room: roomName };
    } catch (error: any) {
      this.logger.error(
        `[EventsGateway] Error joining custom run room: ${error.message}`,
      );
      throw new WsException({ success: false, message: error.message });
    }
  }

  // ─── Per-user notification room ─────────────────────────────────────────────
  /**
   * Client gửi { user_id } để join room riêng của mình.
   * Backend sẽ emit 'notification_received' vào room này khi có thông báo mới.
   */
  @SubscribeMessage('join_user_room')
  handleJoinUserRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { user_id: string },
  ) {
    try {
      if (!payload?.user_id) {
        throw new WsException({ success: false, message: 'Missing user_id' });
      }
      const roomName = `user_${payload.user_id}`;
      client.join(roomName);
      this.logger.log(
        `[EventsGateway] Client ${client.id} joined user room ${roomName}`,
      );
      return { success: true, event: 'joined_user_room', room: roomName };
    } catch (error: any) {
      this.logger.error(
        `[EventsGateway] Error joining user room: ${error.message}`,
      );
      throw new WsException({ success: false, message: error.message });
    }
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
