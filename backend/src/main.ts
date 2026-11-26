import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { isAllowedOrigin, requireSecret } from './common/config/secrets';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Dừng ngay nếu thiếu secret, thay vì chạy với khóa mặc định đoán được.
  requireSecret('JWT_SECRET');
  requireSecret('JUDGE_SECRET');

  app.enableCors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');
  // Kết quả sinh test từ máy chấm có thể vài MB; chỉ nới giới hạn cho đúng đường dẫn này
  // (đăng ký trước bộ đọc JSON mặc định 100 KB của Nest).
  app.use('/api/v1/webhook/judge/batch', json({ limit: '40mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Online Judge API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err) => console.error(err));