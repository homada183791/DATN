import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    googleLogin: jest.fn(),
  };

  beforeEach(async () => {
    authService.googleLogin.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes the Google access token to the auth service', async () => {
    const result = { success: true };
    authService.googleLogin.mockResolvedValue(result);

    await expect(
      controller.googleLogin({ accessToken: 'google-access-token' }),
    ).resolves.toBe(result);
    expect(authService.googleLogin).toHaveBeenCalledWith('google-access-token');
  });
});
