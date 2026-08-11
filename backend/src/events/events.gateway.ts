import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JoinSubmissionRoomDto } from './dto/join-submission-room.dto';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  afterInit(server: Server) {
    this.logger.log('Websocket Gateway Initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`[EventsGateway] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[EventsGateway] Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_submission')
  handleJoinSubmission(
    @ConnectedSocket() client: Socket,
    @MessageBody() joinSubmissionRoomDto: JoinSubmissionRoomDto,
  ) {
    try {
      const roomName = `submission_${joinSubmissionRoomDto.submission_id}`;
      client.join(roomName);
      this.logger.log(`[EventsGateway] Client ${client.id} joined room ${roomName}`);
      return { success: true, event: 'joined', room: roomName };
    } catch (error) {
      this.logger.error(`[EventsGateway] Error joining room: ${error.message}`);
      return { success: false, error: 'Cannot join room' };
    }
  }

  public emitSubmissionUpdate(submission_id: string, payload: any) {
    try {
      const roomName = `submission_${submission_id}`;
      this.server.to(roomName).emit('submission_status_changed', payload);
      this.logger.log(`[EventsGateway] Emitted status update to room ${roomName}`);
    } catch (error) {
      this.logger.error(`[EventsGateway] Error emitting update: ${error.message}`);
    }
  }
}
