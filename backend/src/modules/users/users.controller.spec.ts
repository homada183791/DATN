import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: any;

  beforeEach(async () => {
    service = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      getUserStats: jest.fn(),
      getTopRated: jest.fn(),
      getHeatmap: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call getProfile with user id', async () => {
    const mockProfile = { id: 'u1', full_name: 'Nguyen Van A' };
    service.getProfile.mockResolvedValue(mockProfile);

    const result = await controller.getProfile({ user: { userId: 'u1' } });
    expect(result).toBe(mockProfile);
    expect(service.getProfile).toHaveBeenCalledWith('u1');
  });

  it('should call updateProfile with user id and dto', async () => {
    const dto = { full_name: 'New Name' };
    const mockUpdated = { id: 'u1', full_name: 'New Name' };
    service.updateProfile.mockResolvedValue(mockUpdated);

    const result = await controller.updateProfile({ user: { userId: 'u1' } }, dto);
    expect(result).toBe(mockUpdated);
    expect(service.updateProfile).toHaveBeenCalledWith('u1', dto);
  });

  it('should call changePassword with user id and dto', async () => {
    const dto = { current_password: '123', new_password: '456' };
    const mockRes = { success: true, message: 'Đổi mật khẩu thành công' };
    service.changePassword.mockResolvedValue(mockRes);

    const result = await controller.changePassword({ user: { userId: 'u1' } }, dto);
    expect(result).toBe(mockRes);
    expect(service.changePassword).toHaveBeenCalledWith('u1', dto);
  });

  it('should call getUserStats with user id', async () => {
    const mockStats = { total_submissions: 10, solved_count: 5 };
    service.getUserStats.mockResolvedValue(mockStats);

    const result = await controller.getUserStats({ user: { userId: 'u1' } });
    expect(result).toBe(mockStats);
    expect(service.getUserStats).toHaveBeenCalledWith('u1');
  });
});
