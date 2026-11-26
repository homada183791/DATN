import { ForbiddenException } from '@nestjs/common';
import { SkillsService } from './skills.service';

function makePrisma(over: Record<string, unknown> = {}) {
  const store = new Map<string, any>();
  const key = (w: any) => `${w.student_id}|${w.skill_id}|${w.scope}`;
  const prisma: any = {
    submission: {
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    problemSkill: { findMany: jest.fn().mockResolvedValue([{ skill_id: 'k1' }]) },
    classStudent: { findMany: jest.fn().mockResolvedValue([{ class_id: 'cl1' }]) },
    homework: { findMany: jest.fn().mockResolvedValue([{ class_id: 'cl1', tasks: [{ problem_id: 'p1', points: 10 }] }]) },
    contestProblem: { findMany: jest.fn().mockResolvedValue([]) },
    skillMastery: {
      findUnique: jest.fn(async ({ where }) => store.get(key(where.student_id_skill_id_scope)) ?? null),
      upsert: jest.fn(async ({ where, create, update }) => {
        const k = key(where.student_id_skill_id_scope);
        store.set(k, store.has(k) ? { ...store.get(k), ...update } : create);
      }),
    },
    ...over,
  };
  return { prisma, store };
}

const judged = (status: string) => ({
  id: 's1', user_id: 'u1', problem_id: 'p1', status, created_at: new Date(), user: { role: 'STUDENT' },
});

describe('SkillsService.onSubmissionJudged', () => {
  it('lần nộp đầu: cập nhật điểm chung và điểm của lớp (lớp xuất phát từ điểm chung)', async () => {
    const { prisma, store } = makePrisma();
    prisma.submission.findUnique.mockResolvedValue(judged('ACCEPTED'));
    const svc = new SkillsService(prisma);
    await expect(svc.onSubmissionJudged('s1')).resolves.toEqual({ updated: 2 });
    const g = store.get('u1|k1|global');
    const c = store.get('u1|k1|cl1');
    expect(g).toMatchObject({ attempts: 1, correct: 1 });
    expect(g.p_mastery).toBeCloseTo(c.p_mastery); // cùng điểm xuất phát 0,3 vì chưa có điểm chung trước đó
    expect(g.p_mastery).toBeGreaterThan(0.6);
  });

  it('đã có lần nộp trước cho bài này → không tính nữa (chống nộp lại cho tới khi đúng)', async () => {
    const { prisma, store } = makePrisma();
    prisma.submission.findUnique.mockResolvedValue(judged('ACCEPTED'));
    prisma.submission.count.mockResolvedValue(1);
    const svc = new SkillsService(prisma);
    await expect(svc.onSubmissionJudged('s1')).resolves.toEqual({ updated: 0 });
    expect(store.size).toBe(0);
  });

  it('lỗi biên dịch và bài chưa có nhãn duyệt thì bỏ qua', async () => {
    const { prisma } = makePrisma();
    prisma.submission.findUnique.mockResolvedValue(judged('COMPILE_ERROR'));
    const svc = new SkillsService(prisma);
    await expect(svc.onSubmissionJudged('s1')).resolves.toEqual({ updated: 0 });
    prisma.submission.findUnique.mockResolvedValue(judged('WRONG_ANSWER'));
    prisma.problemSkill.findMany.mockResolvedValue([]);
    await expect(svc.onSubmissionJudged('s1')).resolves.toEqual({ updated: 0 });
  });

  it('điểm lớp lần đầu xuất phát từ điểm chung đã có', async () => {
    const { prisma, store } = makePrisma();
    store.set('u1|k1|global', { p_mastery: 0.9, attempts: 8, correct: 7 });
    prisma.submission.findUnique.mockResolvedValue(judged('WRONG_ANSWER'));
    const svc = new SkillsService(prisma);
    await svc.onSubmissionJudged('s1');
    const c = store.get('u1|k1|cl1');
    expect(c.attempts).toBe(1);
    expect(c.p_mastery).toBeGreaterThan(0.5); // sai một lần từ 0,9 không rơi về mức thấp
  });
});

describe('SkillsService.replayHistory', () => {
  it('phát lại lịch sử: chỉ lần nộp đầu, tính AUC/accuracy, đường cong học tập', async () => {
    const t = (m: number) => new Date(2026, 0, 1, 0, m);
    const { prisma } = makePrisma({
      problemSkill: { findMany: jest.fn().mockResolvedValue([{ problem_id: 'p1', skill_id: 'k1' }, { problem_id: 'p2', skill_id: 'k1' }]) },
      classStudent: { findMany: jest.fn().mockResolvedValue([]) },
      homework: { findMany: jest.fn().mockResolvedValue([]) },
    });
    prisma.submission.findMany.mockResolvedValue([
      { user_id: 'a', problem_id: 'p1', status: 'WRONG_ANSWER', created_at: t(1) },
      { user_id: 'a', problem_id: 'p1', status: 'ACCEPTED', created_at: t(2) }, // lần nộp lại → bỏ qua
      { user_id: 'a', problem_id: 'p2', status: 'ACCEPTED', created_at: t(3) },
      { user_id: 'b', problem_id: 'p1', status: 'ACCEPTED', created_at: t(4) },
    ]);
    const svc = new SkillsService(prisma);
    const r = await svc.replayHistory(false);
    expect(r.evaluated).toBe(3);
    expect(r.students).toBe(2);
    expect(r.learning_curve[0]).toMatchObject({ attempt: 1, n: 2 });
    expect(r.majority_accuracy).toBeCloseTo(2 / 3);
  });
});

describe('SkillsService.getClassHeatmap', () => {
  it('chỉ giảng viên quản lý lớp mới xem được', async () => {
    const { prisma } = makePrisma({ class: { findUnique: jest.fn().mockResolvedValue({ id: 'cl1', name: 'X', admin_id: 'gv1' }) } });
    const svc = new SkillsService(prisma);
    await expect(svc.getClassHeatmap('cl1', 'gv2')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
