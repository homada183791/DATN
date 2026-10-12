import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionsService } from './submissions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../../events/events.gateway';
import { LocalJudgeService } from './local-judge.service';
import { WebhookService } from '../webhook/webhook.service';
import { BadRequestException } from '@nestjs/common';
import { Language } from '@prisma/client';

describe('SubmissionsService - Language Restriction Tests', () => {
  let service: SubmissionsService;
  let prisma: any;
  let queueService: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1', role: 'STUDENT' }),
      },
      problem: {
        findUnique: jest.fn(),
      },
      submission: {
        create: jest.fn().mockResolvedValue({ id: 'sub-1', status: 'PENDING' }),
      },
    };

    queueService = {
      publishJudgeJob: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: QueueService, useValue: queueService },
        {
          provide: NotificationsService,
          useValue: { createNotification: jest.fn() },
        },
        {
          provide: EventsGateway,
          useValue: { emitSubmissionUpdate: jest.fn(), server: { to: jest.fn().mockReturnThis(), emit: jest.fn() } },
        },
        {
          provide: LocalJudgeService,
          useValue: { evaluateSubmission: jest.fn(), evaluateCustomRun: jest.fn() },
        },
        {
          provide: WebhookService,
          useValue: { processJudgeResult: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
  });

  it('should reject submission if language is not in problem allowed_languages', async () => {
    prisma.problem.findUnique.mockResolvedValue({
      id: 'prob-cpp-only',
      allowed_languages: ['CPP11', 'CPP17', 'CPP20'],
      contests: [],
      time_limit: 1000,
      memory_limit: 256,
      test_cases: [],
    });

    await expect(
      service.submitCode('user-1', {
        problem_id: 'prob-cpp-only',
        language: Language.PYTHON,
        language_version: 'PYTHON3_11',
        source_code: 'print("hello")',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should accept submission if language_version is in problem allowed_languages', async () => {
    prisma.problem.findUnique.mockResolvedValue({
      id: 'prob-cpp-only',
      allowed_languages: ['CPP11', 'CPP17', 'CPP20'],
      contests: [],
      time_limit: 1000,
      memory_limit: 256,
      test_cases: [],
    });

    const result = await service.submitCode('user-1', {
      problem_id: 'prob-cpp-only',
      language: Language.CPP,
      language_version: 'CPP17',
      source_code: '#include <iostream>\nint main(){ return 0; }',
    });

    expect(result).toHaveProperty('submission_id', 'sub-1');
    expect(prisma.submission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          language: Language.CPP,
          language_version: 'CPP17',
        }),
      }),
    );
  });

  it('should accept any language if problem allowed_languages is empty', async () => {
    prisma.problem.findUnique.mockResolvedValue({
      id: 'prob-all-languages',
      allowed_languages: [],
      contests: [],
      time_limit: 1000,
      memory_limit: 256,
      test_cases: [],
    });

    const result = await service.submitCode('user-1', {
      problem_id: 'prob-all-languages',
      language: Language.PYTHON,
      language_version: 'PYTHON3_11',
      source_code: 'print(1+1)',
    });

    expect(result).toHaveProperty('submission_id', 'sub-1');
  });
});
