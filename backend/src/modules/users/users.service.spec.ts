import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    password: '',
    full_name: 'Test User',
    bio: 'My bio',
    institution: 'University',
    avatar_url: 'https://avatar.png',
    role: 'STUDENT',
    elo_rating: 1200,
    current_streak: 2,
    highest_streak: 5,
    last_active_date: new Date(),
    notification_settings: { contestReminder: true },
    preferences: { language: 'vi' },
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    mockUser.password = await bcrypt.hash('OldPassword123', 10);

    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      submission: {
        findMany: jest.fn(),
      },
      class: {
        count: jest.fn(),
      },
      contest: {
        count: jest.fn(),
      },
      classStudent: {
        count: jest.fn(),
      },
      userActivityLog: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return user profile if found', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.getProfile('user-1');
      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getProfile('unknown-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      const updatedMock = { ...mockUser, full_name: 'Updated Name' };
      prisma.user.update.mockResolvedValue(updatedMock);

      const result = await service.updateProfile('user-1', {
        full_name: 'Updated Name',
        institution: 'New University',
      });

      expect(result.full_name).toBe('Updated Name');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            full_name: 'Updated Name',
            institution: 'New University',
          }),
        }),
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully when current password matches', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);

      const result = await service.changePassword('user-1', {
        current_password: 'OldPassword123',
        new_password: 'NewPassword456',
      });

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when current password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.changePassword('user-1', {
          current_password: 'WrongPassword',
          new_password: 'NewPassword456',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserStats', () => {
    it('should compute user submission statistics correctly', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'STUDENT', elo_rating: 1200 });
      prisma.submission.findMany.mockResolvedValue([
        {
          id: 's-1',
          problem_id: 'p-1',
          status: 'ACCEPTED',
          created_at: new Date(),
          problem: { id: 'p-1', title: 'Two Sum', difficulty: 'EASY' },
        },
        {
          id: 's-2',
          problem_id: 'p-1',
          status: 'ACCEPTED',
          created_at: new Date(),
          problem: { id: 'p-1', title: 'Two Sum', difficulty: 'EASY' },
        },
        {
          id: 's-3',
          problem_id: 'p-2',
          status: 'WRONG_ANSWER',
          created_at: new Date(),
          problem: { id: 'p-2', title: 'Add Two Numbers', difficulty: 'MEDIUM' },
        },
      ]);

      const stats = await service.getUserStats('user-1');
      expect(stats.total_submissions).toBe(3);
      expect(stats.solved_count).toBe(1);
      expect(stats.ac_rate).toBe(67);
      expect(stats.verdict_stats.AC).toBe(2);
      expect(stats.verdict_stats.WA).toBe(1);
      expect(stats.instructor_stats).toBeNull();
    });
  });
});
