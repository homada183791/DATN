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

import { ConfigService } from '@nestjs/config';

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
    private readonly configService: ConfigService,
  ) {
    const redisUrl = this.configService.get<string>('REDIS_URL') || process.env.REDIS_URL || 'redis://localhost:6379';
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
    const smtpHost = this.configService.get<string>('SMTP_HOST') || process.env.SMTP_HOST;
    const smtpPort = Number(this.configService.get<string>('SMTP_PORT') || process.env.SMTP_PORT || 587);
    const smtpUser = this.configService.get<string>('SMTP_USER') || process.env.SMTP_USER;
    const smtpPass = this.configService.get<string>('SMTP_PASS') || process.env.SMTP_PASS;
    const smtpFrom = this.configService.get<string>('SMTP_FROM') || process.env.SMTP_FROM || smtpUser;

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

      const expiresFormatted = expiresAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      await transporter.sendMail({
        from: `"JudgeHub Support" <${smtpFrom}>`,
        to: email,
        subject: `[JudgeHub] Mã xác nhận đặt lại mật khẩu: ${code}`,
        text: `Chào bạn,\n\nMã xác nhận đặt lại mật khẩu của bạn là: ${code}\nMã có hiệu lực trong 5 phút (hết hạn lúc ${expiresFormatted}).\n\nNếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này để bảo vệ tài khoản.\n\nTrân trọng,\nĐội ngũ JudgeHub`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; color: #1f2937;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #193a2b; letter-spacing: -0.5px;">JudgeHub</h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280; font-weight: 500;">Hệ thống Luyện tập & Đánh giá Lập trình</p>
            </div>
            <div style="background: #f9fafb; border-radius: 12px; padding: 24px; text-align: center; border: 1px dashed #d1d5db; margin-bottom: 24px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #4b5563; font-weight: 500;">Mã xác nhận đặt lại mật khẩu của bạn là:</p>
              <div style="font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #193a2b; font-family: monospace; padding: 8px 0;">
                ${code}
              </div>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #dc2626; font-weight: 600;">⏱️ Mã có hiệu lực trong 5 phút (hết hạn lúc ${expiresFormatted})</p>
            </div>
            <p style="font-size: 14px; line-height: 22px; color: #4b5563; margin: 0 0 16px 0;">
              Bạn nhận được email này vì đã có yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ <strong>${email}</strong>.
            </p>
            <p style="font-size: 13px; line-height: 20px; color: #6b7280; margin: 0; padding-top: 16px; border-top: 1px solid #f3f4f6;">
              🔒 Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email. Mật khẩu hiện tại của bạn vẫn được an toàn.
            </p>
          </div>
        `,
      });

      this.logger.log(`[Auth] Reset password email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(
        `[Auth] SMTP send failed for ${email}: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.logger.warn(
        `[Auth] Dev fallback for ${email}: code=${code} expiresAt=${expiresAt.toISOString()}`,
      );
    }
  }

  async register(registerDto: RegisterDto) {
    const normalizedEmail = registerDto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email đã tồn tại');
    }

    const trimmedUsername = registerDto.username?.trim();
    if (trimmedUsername) {
      if (trimmedUsername.includes('@')) {
        throw new BadRequestException('Tên đăng nhập không được chứa ký tự @');
      }

      const existingUserByUsername = await this.prisma.user.findFirst({
        where: {
          username: {
            equals: trimmedUsername,
            mode: 'insensitive',
          },
        },
      });

      if (existingUserByUsername) {
        throw new ConflictException('Tên đăng nhập đã được sử dụng');
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        username: trimmedUsername || null,
        password: hashedPassword,
        full_name: registerDto.full_name?.trim() || null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        full_name: true,
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
        : {
            username: {
              equals: loginDto.username?.trim(),
              mode: 'insensitive',
            },
          },
    });

    if (!user || !user.password) {
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
