import 'dotenv/config';
import { PrismaClient, Role, Difficulty } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash('Password123@', 10);

  // 1. Create Student
  const student = await prisma.user.upsert({
    where: { email: 'student@example.com' },
    update: {},
    create: {
      email: 'student@example.com',
      username: 'student',
      password: hashedPassword,
      full_name: 'Nguyễn Văn Sinh Viên',
      role: Role.STUDENT,
      elo_rating: 1250,
      current_streak: 3,
      highest_streak: 7,
      institution: 'Đại Học Công Nghệ',
      bio: 'Đam mê cấu trúc dữ liệu và giải thuật.',
      preferences: {
        editorTheme: 'vs-dark',
        fontSize: '14',
        tabSize: '4',
      },
    },
  });

  // 2. Create Instructor
  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@example.com' },
    update: {},
    create: {
      email: 'instructor@example.com',
      username: 'instructor',
      password: hashedPassword,
      full_name: 'TS. Giảng Viên Mẫu',
      role: Role.INSTRUCTOR,
      institution: 'Đại Học Công Nghệ',
    },
  });

  // 3. Create Class
  const sampleClass = await prisma.class.upsert({
    where: { invite_code: 'CODE2026' },
    update: {},
    create: {
      name: 'Lập Trình Nâng Cao - K20',
      description: 'Lớp học rèn luyện tư duy thuật toán và lập trình thi đấu ICPC.',
      semester: 'HK1 - 2026',
      invite_code: 'CODE2026',
      is_public: true,
      admin_id: instructor.id,
    },
  });

  // Enroll student into class
  await prisma.classStudent.upsert({
    where: {
      class_id_student_id: {
        class_id: sampleClass.id,
        student_id: student.id,
      },
    },
    update: {},
    create: {
      class_id: sampleClass.id,
      student_id: student.id,
    },
  });

  // 4. Get some problems to attach to homework and contest
  const problems = await prisma.problem.findMany({ take: 3 });

  if (problems.length > 0) {
    // 5. Create Homework
    await prisma.homework.create({
      data: {
        title: 'Bài Tập Tuần 1: Mảng và Con Trỏ',
        description: 'Hoàn thành các bài tập giải thuật cơ bản trước hạn chót.',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        class_id: sampleClass.id,
        tasks: problems.map((p, idx) => ({
          id: `task-${idx + 1}`,
          title: p.title,
          difficulty: p.difficulty === Difficulty.HARD ? 'Hard' : p.difficulty === Difficulty.MEDIUM ? 'Medium' : 'Easy',
          points: 10,
          statement: p.description.slice(0, 100),
          problem_id: p.id,
        })),
      },
    });

    // 6. Create Running Contest
    const contest = await prisma.contest.create({
      data: {
        title: 'Đấu Trường Lập Trình Sinh Viên 2026',
        description: 'Kỳ thi thử thách thuật toán trực tuyến dành cho toàn bộ sinh viên.',
        start_time: new Date(Date.now() - 1 * 60 * 60 * 1000), // Bắt đầu 1 giờ trước
        end_time: new Date(Date.now() + 3 * 60 * 60 * 1000), // Kết thúc sau 3 giờ nữa
        is_private: false,
        problems: {
          create: problems.slice(0, 2).map((p) => ({
            problem_id: p.id,
          })),
        },
      },
    });

    // Student joins contest
    await prisma.contestSession.upsert({
      where: {
        contest_id_student_id: {
          contest_id: contest.id,
          student_id: student.id,
        },
      },
      update: {},
      create: {
        contest_id: contest.id,
        student_id: student.id,
        cheat_warnings: 0,
        is_disqualified: false,
      },
    });
  }

  // 7. Notification for student
  await prisma.notification.create({
    data: {
      user_id: student.id,
      type: 'homework_assigned',
      title: 'Bài tập mới: Mảng và Con Trỏ',
      body: 'Giảng viên đã giao bài tập tuần 1 trong lớp Lập Trình Nâng Cao - K20.',
      link: `/student/class/${sampleClass.id}`,
    },
  });

  console.log('Seed users, class, homework, contest, notification completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
