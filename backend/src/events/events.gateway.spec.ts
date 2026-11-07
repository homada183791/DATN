import { Server, Socket } from 'socket.io';
import { EventsGateway } from './events.gateway';

describe('EventsGateway submission progress replay', () => {
  it('replays the latest progress and terminal status when a client joins late', async () => {
    const gateway = new EventsGateway();
    const socket = {
      id: 'socket-1',
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
