import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Danh sách tài khoản Instructor được add cứng vào hệ thống.
 * Đổi email/mật khẩu tại đây trước khi chạy seed lần đầu,
 * và đổi mật khẩu sau khi đăng nhập lần đầu ở môi trường production.
 */
const INSTRUCTOR_ACCOUNTS = [
  { email: 'instructor1@example.com', password: 'Instructor@12345' },
  { email: 'instructor2@example.com', password: 'Instructor@23456' },
];

async function main() {
  for (const account of INSTRUCTOR_ACCOUNTS) {
    const hashedPassword = await bcrypt.hash(account.password, 10);

    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        // Nếu email đã tồn tại, đảm bảo role luôn là INSTRUCTOR
        // (không ghi đè mật khẩu của lần chạy trước để tránh reset ngoài ý muốn)
        role: Role.INSTRUCTOR,
      },
      create: {
        email: account.email,
        password: hashedPassword,
        role: Role.INSTRUCTOR,
      },
    });

    console.log(`✔ Instructor ready: ${user.email} (${user.role})`);
  }
}

main()
  .catch((error) => {
    console.error('Seed thất bại:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
