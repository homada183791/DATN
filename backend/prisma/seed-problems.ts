import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient, Difficulty } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface RawTestCase {
  input: any;
  expected_output: any;
  is_hidden?: boolean;
}

interface RawProblem {
  title: string;
  description?: string;
  difficulty: string;
  time_limit?: number;
  memory_limit?: number;
  solution_language?: string;
  solution_code?: string;
  test_cases?: RawTestCase[];
}

function stringifyVal(val: any): string {
  if (val === undefined || val === null) return '';
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}

function mapDifficulty(diffStr: string): Difficulty {
  const upper = (diffStr || '').toUpperCase();
  if (upper === 'HARD') return Difficulty.HARD;
  if (upper === 'MEDIUM') return Difficulty.MEDIUM;
  return Difficulty.EASY;
}

async function main() {
  console.log('================================================================');
  console.log('       IMPORT & SEED PROBLEMS (MEDIUM & HARD) TO DATABASE       ');
  console.log('================================================================\n');

  const dataDir = path.join(__dirname, 'data');
  const mediumPath = path.join(dataDir, 'Medium.json');
  const hardPath = path.join(dataDir, 'Hard.json');
  const hard450RootPath = path.join(__dirname, '..', '..', 'Hard_450.json');
  const hard450DataPath = path.join(dataDir, 'Hard_450.json');

  let mediumList: RawProblem[] = [];
  let hardList: RawProblem[] = [];
  let hard450List: RawProblem[] = [];

  if (fs.existsSync(mediumPath)) {
    const raw = fs.readFileSync(mediumPath, 'utf-8');
    mediumList = JSON.parse(raw);
    console.log(`Đã đọc Medium.json: ${mediumList.length} bài toán.`);
  } else {
    console.warn(`Không tìm thấy file ${mediumPath}`);
  }

  const actualHard450Path = fs.existsSync(hard450DataPath)
    ? hard450DataPath
    : fs.existsSync(hard450RootPath)
    ? hard450RootPath
    : null;

  if (actualHard450Path) {
    const raw = fs.readFileSync(actualHard450Path, 'utf-8');
    hard450List = JSON.parse(raw);
    console.log(`Đã đọc Hard_450.json: ${hard450List.length} bài toán song ngữ [Tiếng Việt] & [English].`);
  }

  if (fs.existsSync(hardPath)) {
    const raw = fs.readFileSync(hardPath, 'utf-8');
    hardList = JSON.parse(raw);
    console.log(`Đã đọc Hard.json: ${hardList.length} bài toán.`);
  } else {
    console.warn(`Không tìm thấy file ${hardPath}`);
  }

  // Ưu tiên Hard_450.json trước Hard.json để lấy bản mô tả song ngữ đầy đủ
  const allProblems: RawProblem[] = [...mediumList, ...hard450List, ...hardList];
  console.log(`Tổng cộng cần xử lý: ${allProblems.length} bài toán.\n`);

  // Lấy danh sách tiêu đề các bài toán đã tồn tại trong DB để tránh trùng lặp
  const existingProblems = await prisma.problem.findMany({
    select: { id: true, title: true },
  });
  const existingTitleMap = new Map<string, string>();
  for (const p of existingProblems) {
    existingTitleMap.set(p.title.trim().toLowerCase(), p.id);
  }
  console.log(`Hiện tại DB đang có ${existingTitleMap.size} bài toán.\n`);

  let insertedProblems = 0;
  let skippedProblems = 0;
  let totalTestCases = 0;

  const BATCH_SIZE = 25;
  const totalBatches = Math.ceil(allProblems.length / BATCH_SIZE);

  for (let b = 0; b < totalBatches; b++) {
    const batch = allProblems.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);

    for (const rawProb of batch) {
      const cleanTitle = (rawProb.title || 'Untitled Problem').trim();
      const titleKey = cleanTitle.toLowerCase();

      if (existingTitleMap.has(titleKey)) {
        const existingId = existingTitleMap.get(titleKey);
        // Nếu bài trong DB đã có nhưng file hiện tại có mô tả song ngữ chuẩn [Tiếng Việt] & [English]
        if (
          existingId &&
          existingId !== 'created' &&
          rawProb.description &&
          rawProb.description.includes('[Tiếng Việt]')
        ) {
          try {
            await prisma.problem.update({
              where: { id: existingId },
              data: { description: rawProb.description.trim() },
            });
          } catch {
            // bỏ qua nếu lỗi
          }
        }
        skippedProblems++;
        continue;
      }

      // Xử lý description (đặc biệt cho Hard.json bị thiếu description)
      let description = (rawProb.description || '').trim();
      if (!description) {
        description = `### Đề bài: ${cleanTitle}\n\nHãy viết chương trình giải quyết bài toán **${cleanTitle}** tối ưu theo các ràng buộc:\n- **Thời gian chạy tối đa:** ${rawProb.time_limit || 1000} ms\n- **Bộ nhớ tối đa:** ${rawProb.memory_limit || 256} MB\n\nXem kỹ các test case mẫu bên dưới để hiểu định dạng Input và Output.`;
      }

      const diff = mapDifficulty(rawProb.difficulty);
      const timeLimit = Number(rawProb.time_limit) || 1000;
      const memLimit = Number(rawProb.memory_limit) || 256;

      const rawCases = Array.isArray(rawProb.test_cases) ? rawProb.test_cases : [];
      const testCasesData = rawCases.map((tc, idx) => ({
        input: stringifyVal(tc.input),
        expected_output: stringifyVal(tc.expected_output),
        is_hidden: typeof tc.is_hidden === 'boolean' ? tc.is_hidden : idx >= 2,
      }));

      // Tạo bài toán kèm test cases
      await prisma.problem.create({
        data: {
          title: cleanTitle,
          description,
          difficulty: diff,
          time_limit: timeLimit,
          memory_limit: memLimit,
          test_cases: {
            create: testCasesData,
          },
        },
      });

      existingTitleMap.set(titleKey, 'created');
      insertedProblems++;
      totalTestCases += testCasesData.length;
    }

    const currentProcessed = Math.min((b + 1) * BATCH_SIZE, allProblems.length);
    const percent = ((currentProcessed / allProblems.length) * 100).toFixed(1);
    console.log(`[Batch ${b + 1}/${totalBatches}] Tiến độ: ${currentProcessed}/${allProblems.length} bài (${percent}%) | Mới thêm: ${insertedProblems} | Đã bỏ qua trùng: ${skippedProblems}`);
  }

  console.log('\n================================================================');
  console.log('                   KẾT QUẢ IMPORT HOÀN TẤT                      ');
  console.log('================================================================');
  console.log(`- Số bài toán mới được thêm:  ${insertedProblems}`);
  console.log(`- Số bài toán đã có (bỏ qua): ${skippedProblems}`);
  console.log(`- Tổng số test cases được tạo: ${totalTestCases}`);
  const finalCount = await prisma.problem.count();
  console.log(`- Tổng số bài toán trong DB hiện tại: ${finalCount}`);
  console.log('================================================================\n');
}

main()
  .catch((err) => {
    console.error('Lỗi khi import problems:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
