import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

type ProblemInput = {
  title: string;
  description: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  time_limit: number;
  memory_limit: number;
  test_cases?: Array<{
    input: string;
    expected_output: string;
    is_hidden?: boolean;
  }>;
};

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const filePath = resolve(process.cwd(), '..', 'leetcode_problems.json');
    const problems = JSON.parse(await readFile(filePath, 'utf8')) as ProblemInput[];
    let created = 0;
    let skipped = 0;

    for (const problem of problems) {
      const existing = await prisma.problem.findFirst({
        where: { title: problem.title },
        select: { id: true },
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      const testCases = (problem.test_cases ?? []).filter(
        (testCase) => testCase.input.trim() && testCase.expected_output.trim(),
      );

      await prisma.problem.create({
        data: {
          title: problem.title,
          description: problem.description,
          difficulty: problem.difficulty ?? 'MEDIUM',
          time_limit: problem.time_limit,
          memory_limit: problem.memory_limit,
          test_cases: {
            create: testCases.map((testCase) => ({
              input: testCase.input,
              expected_output: testCase.expected_output,
              is_hidden: testCase.is_hidden ?? true,
            })),
          },
        },
      });

      created += 1;
      console.log(`Created: ${problem.title}`);
    }

    console.log(`Finished. Created: ${created}; skipped existing: ${skipped}.`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});