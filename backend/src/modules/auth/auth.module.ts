import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { requireSecret } from '../../common/config/secrets';

@Module({
  imports: [
    PassportModule,
    // registerAsync: đọc secret lúc khởi tạo DI (sau khi ConfigModule nạp .env),
    // không đọc lúc import file như trước.
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: requireSecret('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
