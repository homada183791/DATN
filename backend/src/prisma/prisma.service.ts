import 'dotenv/config'; // Đảm bảo Node.js đọc được biến process.env.DATABASE_URL từ file .env
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private static readonly logger = new Logger(PrismaService.name);

  constructor() {
    // 1. Tạo Pool kết nối bằng driver pg nguyên bản
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Chủ động đóng các kết nối rảnh trước khi chúng bị phía server/hệ điều
      // hành (vd: máy ngủ, mất mạng tạm thời, Postgres tự ngắt kết nối rảnh)
      // âm thầm cắt ngang — tránh lỗi "Connection terminated unexpectedly"
      // khi pool tái sử dụng một kết nối đã chết.
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      keepAlive: true,
      max: 10,
    });

    // Bắt buộc phải lắng nghe lỗi trên Pool — pg-pool có thể bắn ra sự kiện
    // 'error' bất đồng bộ khi một client đang rảnh (idle) bị ngắt kết nối từ
    // phía server. Không lắng nghe sẽ khiến lỗi này thoát ra ngoài dưới dạng
    // unhandled rejection và có thể làm crash cả tiến trình Node, thay vì chỉ
    // ảnh hưởng tới request đang dùng kết nối đó.
    pool.on('error', (err) => {
      PrismaService.logger.error(
        `Lỗi không mong muốn từ kết nối PostgreSQL rảnh (sẽ tự động mở kết nối mới cho request tiếp theo): ${err.message}`,
      );
    });

    // 2. Bọc Pool đó vào Prisma Adapter
    const adapter = new PrismaPg(pool);

    // 3. Khởi tạo PrismaClient với adapter này
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
