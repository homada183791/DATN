import 'dotenv/config'; // Đảm bảo Node.js đọc được biến process.env.DATABASE_URL từ file .env
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // 1. Tạo Pool kết nối bằng driver pg nguyên bản
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
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