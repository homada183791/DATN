import { Body, Controller, Module, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { registerLargeBodyRoutes } from './body-limits';

@Controller()
class EchoController {
  @Post('auth/login') login(@Body() b: unknown) { return b; }
  @Post('problems') create(@Body() b: unknown) { return { size: JSON.stringify(b).length }; }
}
@Module({ controllers: [EchoController] })
class EchoModule {}

describe('registerLargeBodyRoutes', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await NestFactory.create(EchoModule, { logger: false });
    app.setGlobalPrefix('api/v1');
    registerLargeBodyRoutes(app);
    await app.init();
  });
  afterAll(() => app.close());

  it('các API khác (đăng nhập) vẫn đọc được body JSON', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ identifier: 'a', password: 'Password123@' });
    expect(res.body).toEqual({ identifier: 'a', password: 'Password123@' });
  });

  it('đường dẫn /problems nhận body lớn hơn 100kb', async () => {
    const big = 'x'.repeat(2_000_000);
    const res = await request(app.getHttpServer()).post('/api/v1/problems').send({ big });
    expect(res.status).toBe(201);
    expect(res.body.size).toBeGreaterThan(2_000_000);
  });

  it('API khác vẫn giữ giới hạn mặc định', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ big: 'x'.repeat(500_000) });
    expect(res.status).toBe(413);
  });
});
