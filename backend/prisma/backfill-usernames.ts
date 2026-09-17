import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- BẮT ĐẦU ĐỒNG BỘ USERNAME CHO CÁC USER HIỆN CÓ ---');

  const users = await prisma.user.findMany({
    orderBy: { created_at: 'asc' },
    select: { id: true, email: true, username: true },
  });

  const takenUsernames = new Set<string>();

  // Thu thập các username đã có sẵn
  for (const u of users) {
    if (u.username) {
      takenUsernames.add(u.username.toLowerCase());
    }
  }

  let updatedCount = 0;

  for (const u of users) {
    if (u.username) {
      console.log(`User ${u.email} đã có username: "${u.username}", bỏ qua.`);
      continue;
    }

    const emailPrefix = u.email.split('@')[0].trim();
    let baseUsername = emailPrefix.replace(/[^a-zA-Z0-9_.-]/g, '');
    if (baseUsername.length < 3) {
      baseUsername = `user_${baseUsername}`;
    }

    let candidate = baseUsername;
    let counter = 1;

    // Tránh trùng lặp username
    while (takenUsernames.has(candidate.toLowerCase())) {
      candidate = `${baseUsername}_${counter}`;
      counter++;
    }

    takenUsernames.add(candidate.toLowerCase());

    await prisma.user.update({
      where: { id: u.id },
      data: { username: candidate },
    });

    console.log(`✓ Đã cập nhật cho [${u.email}] -> username: "${candidate}"`);
    updatedCount++;
  }

  console.log(`\nHoàn thành! Đã cập nhật ${updatedCount} tài khoản.`);
}

main()
  .catch((e) => {
    console.error('Lỗi khi backfill username:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
