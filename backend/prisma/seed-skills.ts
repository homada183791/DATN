/**
 * Dữ liệu mẫu cho tính năng Kỹ năng (KCGen-KT / BKT) — CHỈ DÙNG ĐỂ TEST/DEMO.
 *
 *   npm run seed:skills            gắn nhãn + tạo lớp mẫu, 12 sinh viên mẫu, lịch sử nộp bài giả, tính điểm
 *   npm run seed:skills -- --clean xoá lớp mẫu, sinh viên mẫu và bài nộp giả (giữ nhãn kỹ năng của bài)
 *   npm run seed:skills -- --clean-tags  xoá thêm các nhãn do script này gắn (source = SEED)
 *
 * Nhãn của bài được đoán theo từ khoá trong đề + lời giải mẫu (prisma/data/*.json), không gọi AI.
 * Bài đã có nhãn giảng viên duyệt thì giữ nguyên.
 * Lịch sử nộp bài được SINH theo mô hình BKT (mỗi sinh viên có năng lực thật khác nhau từng kỹ năng,
 * học dần sau mỗi bài) để bảng nhiệt, AUC và đường cong học tập có ý nghĩa.
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient, Role, Difficulty, Language, SubmissionStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { SKILL_KEYWORDS } from '../src/modules/skills/skill-suggester';
import { SkillsService } from '../src/modules/skills/skills.service';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const DEMO_DOMAIN = 'demo.judgehub.local';
const DEMO_CLASS_CODE = 'DEMOKC';
const DEMO_PASSWORD = 'Demo@123';

// ─── Bộ sinh số ngẫu nhiên cố định (chạy lại ra cùng dữ liệu) ───────────────
let seed = 20261126;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const shuffle = <T>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ─── 1. Gắn nhãn kỹ năng theo từ khoá ──────────────────────────────────────
const GENERIC = new Set(['ARRAY_1D', 'CONDITIONALS', 'NESTED_LOOPS', 'STRING_PROCESSING', 'GRAPH_REPRESENTATION']);

function guessSkills(text: string): string[] {
  const hits = SKILL_KEYWORDS.filter(([, re]) => re.test(text)).map(([code]) => code);
  const specific = hits.filter((c) => !GENERIC.has(c));
  const generic = hits.filter((c) => GENERIC.has(c));
  const out = specific.slice(0, 3);
  for (const g of generic) if (out.length < 2) out.push(g);
  if (out.length === 0) out.push('SIMULATION');
  return out;
}

function loadSolutions(): Map<string, string> {
  const map = new Map<string, string>();
  for (const file of ['Medium.json', 'Hard.json']) {
    const p = path.join(__dirname, 'data', file);
    if (!fs.existsSync(p)) continue;
    const list = JSON.parse(fs.readFileSync(p, 'utf8')) as Array<{ title?: string; solution_code?: string }>;
    for (const x of list) if (x.title) map.set(x.title.trim().toLowerCase(), x.solution_code ?? '');
  }
  return map;
}

async function tagProblems() {
  const skills = await prisma.skill.findMany();
  if (skills.length === 0) throw new Error('Chưa có danh mục kỹ năng — hãy chạy "npx prisma migrate deploy" trước.');
  const idByCode = new Map(skills.map((s) => [s.code, s.id]));
  const solutions = loadSolutions();
  const problems = await prisma.problem.findMany({
    select: { id: true, title: true, description: true, skills: { where: { approved: true }, select: { skill_id: true } } },
  });
  let tagged = 0;
  let kept = 0;
  const rows: Array<{ problem_id: string; skill_id: string; source: string; approved: boolean; reason: string }> = [];
  for (const p of problems) {
    if (p.skills.length > 0) {
      kept++;
      continue;
    }
    const text = `${p.title}\n${p.description}\n${solutions.get(p.title.trim().toLowerCase()) ?? ''}`;
    for (const code of guessSkills(text)) {
      const skillId = idByCode.get(code);
      if (skillId) rows.push({ problem_id: p.id, skill_id: skillId, source: 'SEED', approved: true, reason: 'Gắn tự động theo từ khoá (dữ liệu mẫu)' });
    }
    tagged++;
  }
  for (let i = 0; i < rows.length; i += 1000) {
    await prisma.problemSkill.createMany({ data: rows.slice(i, i + 1000), skipDuplicates: true });
  }
  console.log(`[1/4] Gắn nhãn: ${tagged} bài mới (${rows.length} nhãn), giữ nguyên ${kept} bài đã có nhãn duyệt.`);
}

// ─── 2. Lớp mẫu + sinh viên mẫu ────────────────────────────────────────────
const DEMO_STUDENTS = [
  'Nguyễn Minh An', 'Trần Thu Bình', 'Lê Quốc Cường', 'Phạm Ngọc Dung', 'Hoàng Gia Huy', 'Võ Hồng Phúc',
  'Đỗ Hà Giang', 'Bùi Thanh Hải', 'Đặng Khánh Linh', 'Ngô Quốc Minh', 'Dương Thảo Nhi', 'Lý Tuấn Kiệt',
];
/** Kỹ năng mà lớp mẫu tập trung — chọn bài phủ các kỹ năng này. */
const CLASS_SKILLS = [
  'SORTING', 'BINARY_SEARCH', 'BINARY_SEARCH_ANSWER', 'PREFIX_SUM', 'TWO_POINTERS', 'GREEDY',
  'HASH_MAP', 'DP_1D', 'DP_KNAPSACK', 'DP_2D', 'BFS', 'DFS',
];

async function createDemoClass() {
  const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);
  const instructor =
    (await prisma.user.findFirst({ where: { role: Role.INSTRUCTOR }, orderBy: { created_at: 'asc' } })) ??
    (await prisma.user.create({
      data: { email: `demo.gv@${DEMO_DOMAIN}`, username: 'demo.gv', password: hashed, full_name: 'Giảng viên Demo', role: Role.INSTRUCTOR },
    }));

  const students: Array<{ id: string }> = [];
  for (let i = 0; i < DEMO_STUDENTS.length; i++) {
    const n = String(i + 1).padStart(2, '0');
    students.push(
      await prisma.user.upsert({
        where: { email: `demo.sv${n}@${DEMO_DOMAIN}` },
        update: {},
        create: {
          email: `demo.sv${n}@${DEMO_DOMAIN}`,
          username: `demo.sv${n}`,
          student_code: `DEMO${n}`,
          password: hashed,
          full_name: DEMO_STUDENTS[i],
          role: Role.STUDENT,
        },
      }),
    );
  }

  const cls = await prisma.class.upsert({
    where: { invite_code: DEMO_CLASS_CODE },
    update: {},
    create: {
      name: 'Demo Kỹ năng - CTDL',
      subject: 'Cấu trúc dữ liệu & Giải thuật',
      description: 'Lớp mẫu để thử tính năng Kỹ năng (dữ liệu giả). Xoá bằng: npm run seed:skills -- --clean',
      semester: 'HK1 - 2026',
      invite_code: DEMO_CLASS_CODE,
      is_public: false,
      admin_id: instructor.id,
    },
  });
  await prisma.classStudent.createMany({
    data: students.map((s) => ({ class_id: cls.id, student_id: s.id })),
    skipDuplicates: true,
  });

  // Chọn 12 bài phủ các kỹ năng của lớp (mỗi kỹ năng ít nhất 1 bài)
  const skillRows = await prisma.skill.findMany({ where: { code: { in: CLASS_SKILLS } } });
  const chosen: Array<{ id: string; title: string; difficulty: Difficulty }> = [];
  for (const sk of shuffle(skillRows)) {
    if (chosen.length >= 12) break;
    const candidates = await prisma.problemSkill.findMany({
      where: { skill_id: sk.id, approved: true, problem: { in_bank: true } },
      select: { problem: { select: { id: true, title: true, difficulty: true } } },
      take: 40,
    });
    const free = candidates.map((c) => c.problem).filter((p) => !chosen.some((x) => x.id === p.id));
    if (free.length) chosen.push(pick(free));
  }

  await prisma.homework.deleteMany({ where: { class_id: cls.id } });
  const now = Date.now();
  const day = 86_400_000;
  const groups = [chosen.slice(0, 4), chosen.slice(4, 8), chosen.slice(8, 12)];
  const titles = ['Tuần 1 — Sắp xếp & tìm kiếm', 'Tuần 2 — Kỹ thuật mảng & tham lam', 'Tuần 3 — Quy hoạch động & đồ thị'];
  for (let g = 0; g < groups.length; g++) {
    if (groups[g].length === 0) continue;
    await prisma.homework.create({
      data: {
        class_id: cls.id,
        title: titles[g],
        description: 'Bài tập mẫu để thử tính năng Kỹ năng.',
        deadline: new Date(now + (g - 1) * 7 * day),
        tasks: groups[g].map((p, i) => ({
          id: `demo-${g}-${i}`,
          title: p.title,
          statement: '',
          difficulty: p.difficulty === 'EASY' ? 'Easy' : p.difficulty === 'HARD' ? 'Hard' : 'Medium',
          points: 10,
          problem_id: p.id,
        })),
      },
    });
  }
  console.log(`[2/4] Lớp mẫu "${cls.name}" (mã ${DEMO_CLASS_CODE}): ${students.length} sinh viên, ${chosen.length} bài trong 3 bài tập.`);
  return { cls, students, classProblems: chosen };
}

// ─── 3. Sinh lịch sử nộp bài theo BKT ──────────────────────────────────────
async function simulateSubmissions(students: Array<{ id: string }>, classProblems: Array<{ id: string }>) {
  const ids = students.map((s) => s.id);
  await prisma.submission.deleteMany({ where: { user_id: { in: ids } } });

  // Thêm bài luyện tập ngoài lớp (Kho bài tập) để có điểm "chung"
  const practicePool = await prisma.problemSkill.findMany({
    where: { approved: true, problem: { in_bank: true } },
    select: { problem_id: true },
    distinct: ['problem_id'],
    take: 400,
  });
  const tagsOf = new Map<string, string[]>();
  const allTags = await prisma.problemSkill.findMany({ where: { approved: true }, select: { problem_id: true, skill_id: true } });
  for (const t of allTags) tagsOf.set(t.problem_id, [...(tagsOf.get(t.problem_id) ?? []), t.skill_id]);

  // Gần với tham số BKT mặc định (slip 0,1 · guess 0,2 · learn 0,1) để mô hình đánh giá công bằng
  const SLIP = 0.1;
  const GUESS = 0.2;
  const LEARN = 0.14;
  const start = Date.now() - 28 * 86_400_000;
  const rows: Array<{
    user_id: string; problem_id: string; language: Language; source_code: string; status: SubmissionStatus;
    score: number; execution_time: number | null; memory_used: number | null; created_at: Date; updated_at: Date;
  }> = [];

  students.forEach((st, idx) => {
    // Năng lực: mỗi sinh viên có mức chung + điểm mạnh/yếu riêng từng kỹ năng
    const base = 0.15 + (idx / (students.length - 1)) * 0.6;
    const known = new Map<string, boolean>();
    const knowProb = (skillId: string) => {
      const h = [...skillId].reduce((a, c) => a + c.charCodeAt(0), idx * 31) % 100;
      return Math.max(0.03, Math.min(0.95, base + (h / 100 - 0.5) * 0.5));
    };
    const isKnown = (k: string) => {
      if (!known.has(k)) known.set(k, rand() < knowProb(k));
      return known.get(k)!;
    };
    const practice = shuffle(practicePool.map((p) => p.problem_id)).slice(0, 25 + Math.floor(rand() * 15));
    const order = shuffle([...classProblems.map((p) => p.id), ...practice]);
    let t = start + idx * 3_600_000;
    for (const pid of order) {
      if (rand() < 0.12) continue; // bỏ qua một số bài
      const skills = tagsOf.get(pid) ?? [];
      if (skills.length === 0) continue;
      t += (0.5 + rand() * 2.5) * 86_400_000 * (28 / order.length) * 0.6;
      const frac = skills.filter(isKnown).length / skills.length;
      let correct = rand() < frac * (1 - SLIP) + (1 - frac) * GUESS;
      const lang = pick([Language.CPP, Language.CPP, Language.PYTHON, Language.JAVA]);
      if (rand() < 0.06) {
        rows.push(mk(st.id, pid, lang, SubmissionStatus.COMPILE_ERROR, t));
        t += 120_000;
      }
      rows.push(mk(st.id, pid, lang, correct ? SubmissionStatus.ACCEPTED : pick([SubmissionStatus.WRONG_ANSWER, SubmissionStatus.WRONG_ANSWER, SubmissionStatus.TIME_LIMIT_EXCEEDED, SubmissionStatus.RUNTIME_ERROR]), t));
      // Học được sau khi làm bài
      for (const k of skills) if (!isKnown(k) && rand() < LEARN) known.set(k, true);
      // Nộp lại sau khi sai (không được tính vào điểm kỹ năng)
      let tries = 0;
      while (!correct && tries < 2 && rand() < 0.6) {
        tries++;
        t += 600_000;
        correct = rand() < 0.5;
        rows.push(mk(st.id, pid, lang, correct ? SubmissionStatus.ACCEPTED : SubmissionStatus.WRONG_ANSWER, t));
      }
    }
  });

  function mk(user_id: string, problem_id: string, language: Language, status: SubmissionStatus, t: number) {
    const at = new Date(Math.min(t, Date.now() - 60_000));
    return {
      user_id, problem_id, language, status,
      source_code: '// bài nộp mẫu (seed-skills)',
      score: status === SubmissionStatus.ACCEPTED ? 100 : 0,
      execution_time: status === SubmissionStatus.COMPILE_ERROR ? null : Math.floor(5 + rand() * 400),
      memory_used: status === SubmissionStatus.COMPILE_ERROR ? null : Math.floor(2 + rand() * 30),
      created_at: at, updated_at: at,
    };
  }

  for (let i = 0; i < rows.length; i += 500) await prisma.submission.createMany({ data: rows.slice(i, i + 500) });
  console.log(`[3/4] Sinh ${rows.length} bài nộp giả cho ${students.length} sinh viên mẫu.`);
}

// ─── 4. Tính lại điểm + đánh giá ───────────────────────────────────────────
async function recompute() {
  const service = new SkillsService(prisma as never);
  const r = await service.replayHistory(true);
  const f = (x: number | null) => (x == null ? '—' : x.toFixed(3));
  console.log(`[4/4] Tính lại điểm kỹ năng: ${r.evaluated} lần làm bài của ${r.students} sinh viên trên ${r.tagged_problems} bài có nhãn.`);
  console.log(`      AUC=${f(r.auc)}  Accuracy=${f(r.accuracy)}  F1=${f(r.f1)}  (mốc đoán đa số=${f(r.majority_accuracy)})`);
  console.log(`      Đường cong học tập (tỉ lệ sai theo lần thử): ${r.learning_curve.map((c) => `${c.attempt}:${Math.round(c.error_rate * 100)}%`).join('  ')}`);
}

async function clean(withTags: boolean) {
  const users = await prisma.user.findMany({ where: { email: { endsWith: `@${DEMO_DOMAIN}` }, role: Role.STUDENT }, select: { id: true } });
  await prisma.class.deleteMany({ where: { invite_code: DEMO_CLASS_CODE } });
  await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
  console.log(`Đã xoá lớp mẫu ${DEMO_CLASS_CODE} và ${users.length} sinh viên mẫu (kèm bài nộp, điểm kỹ năng).`);
  if (withTags) {
    const r = await prisma.problemSkill.deleteMany({ where: { source: 'SEED' } });
    console.log(`Đã xoá ${r.count} nhãn kỹ năng do script gắn.`);
  }
  await recompute();
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--clean') || args.includes('--clean-tags')) return clean(args.includes('--clean-tags'));
  await tagProblems();
  const { students, classProblems } = await createDemoClass();
  await simulateSubmissions(students, classProblems);
  await recompute();
  console.log(`\nXONG. Đăng nhập thử: demo.sv01 … demo.sv12 / mật khẩu ${DEMO_PASSWORD}`);
  console.log('Giảng viên: vào Lớp học → "Demo Kỹ năng - CTDL" → tab Kỹ năng.');
}

main()
  .catch((e) => {
    console.error('Lỗi seed-skills:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
