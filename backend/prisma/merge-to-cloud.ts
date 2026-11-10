import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// 1. Kết nối DB Local của thành viên (Docker port 5433)
const localConnectionString =
  process.env.LOCAL_DATABASE_URL ||
  'postgresql://root:rootpassword@localhost:5433/online_judge_db?schema=public';

const localPool = new Pool({ connectionString: localConnectionString });
const localPrisma = new PrismaClient({ adapter: new PrismaPg(localPool) });

// 2. Kết nối DB Neon Cloud (đọc từ DATABASE_URL hoặc NEON_DATABASE_URL)
const neonConnectionString =
  process.env.NEON_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_NCqV8LIt3yuW@ep-patient-glitter-az37o1lp-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const neonPool = new Pool({ connectionString: neonConnectionString });
const neonPrisma = new PrismaClient({ adapter: new PrismaPg(neonPool) });

async function main() {
  console.log('================================================================');
  console.log('       ĐỒNG BỘ / MERGE DỮ LIỆU TỪ LOCAL DOCKER LÊN NEON CLOUD    ');
  console.log('================================================================\n');

  try {
    // A. Đồng bộ Users (Bỏ qua nếu đã trùng email hoặc username)
    console.log('-> Đang kiểm tra Users...');
    const localUsers = await localPrisma.user.findMany();
    let userAdded = 0;
    for (const u of localUsers) {
      const existing = await neonPrisma.user.findFirst({
        where: {
          OR: [{ email: u.email }, ...(u.username ? [{ username: u.username }] : [])],
        },
      });
      if (!existing) {
        await neonPrisma.user.create({ data: u as any });
        userAdded++;
      }
    }
    console.log(`✅ Hoàn tất Users: đã thêm ${userAdded}/${localUsers.length} người dùng mới.\n`);

    // B. Đồng bộ Problems & TestCases
    console.log('-> Đang kiểm tra Problems & TestCases...');
    const localProblems = await localPrisma.problem.findMany({
      include: { test_cases: true },
    });
    let problemAdded = 0;
    for (const p of localProblems) {
      const existing = await neonPrisma.problem.findFirst({
        where: {
          OR: [{ id: p.id }, { title: p.title.trim() }],
        },
      });
      if (!existing) {
        const { test_cases, ...pData } = p;
        await neonPrisma.problem.create({
          data: {
            ...pData,
            test_cases: {
              create: test_cases.map(({ id, problem_id, ...tc }) => tc),
            },
          },
        });
        problemAdded++;
      }
    }
    console.log(`✅ Hoàn tất Problems: đã thêm ${problemAdded}/${localProblems.length} bài toán mới.\n`);

    // C. Đồng bộ Classes
    console.log('-> Đang kiểm tra Classes...');
    const localClasses = await localPrisma.class.findMany();
    let classAdded = 0;
    for (const c of localClasses) {
      const existing = await neonPrisma.class.findUnique({
        where: { invite_code: c.invite_code },
      });
      if (!existing) {
        // Kiểm tra xem admin_id có trên Neon không
        const adminExists = await neonPrisma.user.findUnique({
          where: { id: c.admin_id },
        });
        if (adminExists) {
          await neonPrisma.class.create({ data: c });
          classAdded++;
        }
      }
    }
    console.log(`✅ Hoàn tất Classes: đã thêm ${classAdded}/${localClasses.length} lớp học mới.\n`);

    // D. Đồng bộ Contests
    console.log('-> Đang kiểm tra Contests...');
    const localContests = await localPrisma.contest.findMany();
    let contestAdded = 0;
    for (const ct of localContests) {
      const existing = await neonPrisma.contest.findUnique({
        where: { id: ct.id },
      });
      if (!existing) {
        await neonPrisma.contest.create({ data: ct });
        contestAdded++;
      }
    }
    console.log(`✅ Hoàn tất Contests: đã thêm ${contestAdded}/${localContests.length} kỳ thi mới.\n`);

    console.log('🎉 Toàn bộ dữ liệu local đã được gộp thành công lên Neon Cloud!');
  } catch (err: any) {
    console.error('❌ Lỗi khi đồng bộ:', err.message);
  } finally {
    await localPrisma.$disconnect();
    await neonPrisma.$disconnect();
  }
}

main();
