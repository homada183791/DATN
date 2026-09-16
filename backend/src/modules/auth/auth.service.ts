import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { Redis } from 'ioredis';
import * as nodemailer from 'nodemailer';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

interface ResetCodeRecord {
  code: string;
  token: string;
  expiresAt: Date | string;
}

@Injectable()
export class AuthService implements OnModuleDestroy {
  private readonly redisClient: Redis;
  private readonly logger = new Logger(AuthService.name);
  private readonly resetTtlSeconds = 5 * 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redisClient = new Redis(redisUrl);
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private createResetCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private createResetToken() {
    return randomUUID();
  }

  private resetKey(email: string) {
    return `password-reset:${this.normalizeEmail(email)}`;
  }

  private async saveResetRecord(email: string, record: ResetCodeRecord) {
    await this.redisClient.setex(
      this.resetKey(email),
      this.resetTtlSeconds,
      JSON.stringify({
        code: record.code,
        token: record.token,
        expiresAt: record.expiresAt instanceof Date
          ? record.expiresAt.toISOString()
          : record.expiresAt,
      }),
    );
  }

  private async getResetRecord(email: string): Promise<ResetCodeRecord | null> {
    const payload = await this.redisClient.get(this.resetKey(email));

    if (!payload) {
      return null;
    }

    const record = JSON.parse(payload) as ResetCodeRecord;
    const expiresAt = new Date(record.expiresAt);
    if (expiresAt < new Date()) {
      await this.redisClient.del(this.resetKey(email));
      return null;
    }

    return {
      code: record.code,
      token: record.token,
      expiresAt,
    };
  }

  private async deleteResetRecord(email: string) {
    await this.redisClient.del(this.resetKey(email));
  }

  private async sendResetEmail(email: string, code: string, token: string, expiresAt: Date) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn(
        `[Auth] SMTP not configured; dev fallback email payload for ${email}: code=${code} expiresAt=${expiresAt.toISOString()}`,
      );
      return;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || smtpUser,
        to: email,
        subject: 'Mã xác nhận đặt lại mật khẩu',
        text: `Mã xác nhận của bạn là ${code}. Mã sẽ hết hạn vào ${expiresAt.toISOString()}.`,
        html: `<p>Mã xác nhận của bạn là <strong>${code}</strong>.</p><p>Mã sẽ hết hạn vào ${expiresAt.toISOString()}.</p>`,
      });
    } catch (error) {
      this.logger.warn(
        `[Auth] SMTP send failed for ${email}; dev fallback payload created: code=${code} expiresAt=${expiresAt.toISOString()}`,
      );
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email đã tồn tại');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        role: true,
        created_at: true,
      },
    });

    return {
      success: true,
      data: user,
    };
  }

  async login(loginDto: LoginDto) {
    if (!loginDto.email && !loginDto.username) {
      throw new UnauthorizedException('Vui lòng nhập email hoặc tên đăng nhập');
    }

    const user = await this.prisma.user.findFirst({
      where: loginDto.email
        ? { email: loginDto.email.trim().toLowerCase() }
        : { username: loginDto.username?.trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const username = user.username ?? user.email.split('@')[0];
    const payload = { sub: user.id, email: user.email, role: user.role, username };

    return {
      success: true,
      data: {
        access_token: await this.jwtService.signAsync(payload),
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          username,
        },
      },
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const email = this.normalizeEmail(forgotPasswordDto.email);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        success: true,
        data: {
          message: 'Nếu email tồn tại trong hệ thống, mã xác nhận đã được gửi.',
        },
      };
    }

    const code = this.createResetCode();
    const token = this.createResetToken();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.saveResetRecord(email, {
      code,
      token,
      expiresAt,
    });

    await this.sendResetEmail(email, code, token, expiresAt);

    return {
      success: true,
      data: {
        message: 'Mã xác nhận đã được gửi tới email của bạn.',
      },
    };
  }

  async verifyResetCode(verifyResetCodeDto: VerifyResetCodeDto) {
    const email = this.normalizeEmail(verifyResetCodeDto.email);
    const record = await this.getResetRecord(email);

    if (!record) {
      throw new BadRequestException('Mã xác nhận không đúng hoặc đã hết hạn.');
    }

    if (record.code !== verifyResetCodeDto.code.trim()) {
      throw new BadRequestException('Mã xác nhận không đúng hoặc đã hết hạn.');
    }

    return {
      success: true,
      data: {
        verified: true,
        token: record.token,
      },
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const email = this.normalizeEmail(resetPasswordDto.email);
    const record = await this.getResetRecord(email);

    if (!record) {
      throw new BadRequestException('Mã xác nhận không đúng hoặc đã hết hạn.');
    }

    if (record.code !== resetPasswordDto.code.trim()) {
      throw new BadRequestException('Mã xác nhận không đúng hoặc đã hết hạn.');
    }

    if (record.token !== resetPasswordDto.token.trim()) {
      throw new BadRequestException('Token xác nhận không hợp lệ hoặc đã hết hạn.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      await this.deleteResetRecord(email);
      throw new NotFoundException('Tài khoản không tồn tại.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(resetPasswordDto.password, salt);

    await this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    await this.deleteResetRecord(email);

    return {
      success: true,
      data: {
        message: 'Mật khẩu đã được đặt lại thành công.',
      },
    };
  }
}
