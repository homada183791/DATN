import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma, SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiProvider } from '../ai/ai-provider';
import { SKILL_CATALOG } from './skill-catalog';
import {
  buildSkillPrompt,
  parseSkillResponse,
  suggestByKeywords,
  type SuggestedSkill,
} from './skill-suggester';
import {
  DEFAULT_BKT,
  bktPredictCorrect,
  bktUpdate,
  classificationMetrics,
  computeAuc,
  masteryLevel,
} from './bkt';

/** Trạng thái chấm được tính là bằng chứng về kỹ năng. Lỗi biên dịch là lỗi cú pháp, không nói gì về kỹ năng. */
const EVIDENCE_STATUSES: SubmissionStatus[] = [
  SubmissionStatus.ACCEPTED,
  SubmissionStatus.WRONG_ANSWER,
  SubmissionStatus.TIME_LIMIT_EXCEEDED,
  SubmissionStatus.RUNTIME_ERROR,
];

const GLOBAL = 'global';

type Db = Pick<
  PrismaService,
  'skill' | 'problemSkill' | 'skillMastery' | 'submission' | 'classStudent' | 'homework' | 'contestProblem' | 'class' | 'problem'
>;

function problemIdsOfTasks(tasks: Prisma.JsonValue): string[] {
  if (!Array.isArray(tasks)) return [];
  const ids: string[] = [];
  for (const t of tasks as Array<Record<string, unknown>>) {
    const pid = t?.problem_id ?? (typeof t?.id === 'string' && t.id.includes('-') ? t.id : undefined);
    if (typeof pid === 'string') ids.push(pid);
  }
  return ids;
}

function taskPoints(tasks: Prisma.JsonValue): Map<string, number> {
  const m = new Map<string, number>();
  if (!Array.isArray(tasks)) return m;
  for (const t of tasks as Array<Record<string, unknown>>) {
    const pid = typeof t?.problem_id === 'string' ? t.problem_id : undefined;
    if (!pid) continue;
    const pts = typeof t?.points === 'number' && t.points > 0 ? t.points : 10;
    m.set(pid, (m.get(pid) ?? 0) + pts);
  }
  return m;
}

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);
  readonly params = DEFAULT_BKT;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly ai?: AiProvider,
  ) {}

  private get db(): Db {
    return this.prisma as unknown as Db;
  }

  // ─── Danh mục & nhãn của bài ──────────────────────────────────────────────

  listCatalog() {
    return this.db.skill.findMany({ orderBy: { sort: 'asc' } });
  }

  async getProblemSkills(problemId: string) {
    const rows = await this.db.problemSkill.findMany({
      where: { problem_id: problemId },
      include: { skill: true },
      orderBy: { created_at: 'asc' },
    });
    return rows.map((r) => ({
      code: r.skill.code,
      name_vi: r.skill.name_vi,
      name_en: r.skill.name_en,
      category: r.skill.category,
      source: r.source,
      approved: r.approved,
      reason: r.reason,
    }));
  }

  /**
   * AI đề xuất kỹ năng cho bài: lấy đề + tối đa 3 lời giải đúng (khác người, ưu tiên khác ngôn ngữ),
   * gọi LLM chọn trong danh mục. Kết quả lưu ở trạng thái "chờ duyệt"; nhãn giảng viên đã duyệt giữ nguyên.
   */
  async suggestProblemSkills(problemId: string) {
    const problem = await this.db.problem.findUnique({
      where: { id: problemId },
      select: { id: true, title: true, description: true },
    });
    if (!problem) throw new NotFoundException('Không tìm thấy bài tập');

    const accepted = await this.db.submission.findMany({
      where: { problem_id: problemId, status: SubmissionStatus.ACCEPTED },
      select: { user_id: true, language: true, source_code: true },
      orderBy: { created_at: 'desc' },
      take: 60,
    });
    // Chọn lời giải đại diện (bài báo dùng CodeBERT gom cụm; ở đây đơn giản hoá: khác người, khác ngôn ngữ, khác độ dài)
    const picked: Array<{ language: string; code: string }> = [];
    const users = new Set<string>();
    const langs = new Set<string>();
    const sorted = [...accepted].sort((a, b) => a.source_code.length - b.source_code.length);
    const order = [sorted[0], sorted[sorted.length - 1], sorted[Math.floor(sorted.length / 2)], ...sorted].filter(Boolean);
    for (const s of order) {
      if (picked.length >= 3) break;
      if (users.has(s.user_id)) continue;
      if (langs.has(s.language) && langs.size < 2 && order.some((o) => !langs.has(o.language) && !users.has(o.user_id))) continue;
      users.add(s.user_id);
      langs.add(s.language);
      picked.push({ language: s.language, code: s.source_code });
    }

    const validCodes = new Set(SKILL_CATALOG.map((s) => s.code));
    let suggestions: SuggestedSkill[] = [];
    let mode: 'ai' | 'keywords' = 'keywords';
    if (this.ai?.isConfigured()) {
      try {
        const { system, user } = buildSkillPrompt(problem, picked, SKILL_CATALOG);
        const res = await this.ai.complete({
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          maxTokens: 900,
          temperature: 0.1,
        });
        suggestions = parseSkillResponse(res.text, validCodes);
        mode = 'ai';
      } catch (err) {
        this.logger.warn(`[Skills] AI suggest failed for ${problemId}: ${(err as Error).message}`);
      }
    }
    if (suggestions.length === 0) {
      suggestions = suggestByKeywords(`${problem.title}\n${problem.description}\n${picked.map((p) => p.code).join('\n')}`, validCodes);
      mode = 'keywords';
    }

    const skills = await this.db.skill.findMany({ where: { code: { in: suggestions.map((s) => s.code) } } });
    const idByCode = new Map(skills.map((s) => [s.code, s.id]));
    // Bỏ các đề xuất AI cũ chưa duyệt, giữ nhãn đã duyệt
    await this.db.problemSkill.deleteMany({ where: { problem_id: problemId, approved: false } });
    for (const s of suggestions) {
      const skillId = idByCode.get(s.code);
      if (!skillId) continue;
      await this.db.problemSkill.upsert({
        where: { problem_id_skill_id: { problem_id: problemId, skill_id: skillId } },
        create: { problem_id: problemId, skill_id: skillId, source: 'AI', approved: false, reason: s.reason || null },
        update: { reason: s.reason || undefined },
      });
    }
    return { mode, solutions_used: picked.length, skills: await this.getProblemSkills(problemId) };
  }

  /** Giảng viên chốt danh sách kỹ năng của bài: các mã này được duyệt, mã khác bị gỡ. */
  async setProblemSkills(problemId: string, codes: string[]) {
    const problem = await this.db.problem.findUnique({ where: { id: problemId }, select: { id: true } });
    if (!problem) throw new NotFoundException('Không tìm thấy bài tập');
    const unique = [...new Set(codes.map((c) => c.trim().toUpperCase()))].slice(0, 10);
    const skills = await this.db.skill.findMany({ where: { code: { in: unique } } });
    const keepIds = skills.map((s) => s.id);
    await this.db.problemSkill.deleteMany({ where: { problem_id: problemId, skill_id: { notIn: keepIds } } });
    for (const s of skills) {
      await this.db.problemSkill.upsert({
        where: { problem_id_skill_id: { problem_id: problemId, skill_id: s.id } },
        create: { problem_id: problemId, skill_id: s.id, source: 'INSTRUCTOR', approved: true },
        update: { approved: true },
      });
    }
    return this.getProblemSkills(problemId);
  }

  // ─── Cập nhật điểm khi chấm xong ─────────────────────────────────────────

  /** Các lớp mà bài này thuộc về (bài tập về nhà hoặc kỳ thi của lớp) và sinh viên là thành viên. */
  private async classScopesFor(studentId: string, problemId: string): Promise<string[]> {
    const memberships = await this.db.classStudent.findMany({
      where: { student_id: studentId },
      select: { class_id: true },
    });
    if (memberships.length === 0) return [];
    const classIds = memberships.map((m) => m.class_id);
    const [homeworks, contestLinks] = await Promise.all([
      this.db.homework.findMany({ where: { class_id: { in: classIds } }, select: { class_id: true, tasks: true } }),
      this.db.contestProblem.findMany({
        where: { problem_id: problemId, contest: { class_id: { in: classIds } } },
        select: { contest: { select: { class_id: true } } },
      }),
    ]);
    const scopes = new Set<string>();
    for (const h of homeworks) if (problemIdsOfTasks(h.tasks).includes(problemId)) scopes.add(h.class_id);
    for (const c of contestLinks) if (c.contest.class_id) scopes.add(c.contest.class_id);
    return [...scopes];
  }

  /**
   * Gọi sau khi một bài nộp được chấm xong. Chỉ tính LẦN NỘP ĐẦU TIÊN (bỏ qua lỗi biên dịch) của sinh viên
   * cho mỗi bài — nộp lại sau khi xem lỗi không làm điểm kỹ năng tăng giả.
   */
  async onSubmissionJudged(submissionId: string) {
    const sub = await this.db.submission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        user_id: true,
        problem_id: true,
        status: true,
        created_at: true,
        user: { select: { role: true } },
      },
    });
    if (!sub || sub.user.role !== 'STUDENT' || !EVIDENCE_STATUSES.includes(sub.status)) return { updated: 0 };

    const earlier = await this.db.submission.count({
      where: {
        user_id: sub.user_id,
        problem_id: sub.problem_id,
        status: { in: EVIDENCE_STATUSES },
        created_at: { lt: sub.created_at },
      },
    });
    if (earlier > 0) return { updated: 0 };

    const tags = await this.db.problemSkill.findMany({
      where: { problem_id: sub.problem_id, approved: true },
      select: { skill_id: true },
    });
    if (tags.length === 0) return { updated: 0 };

    const correct = sub.status === SubmissionStatus.ACCEPTED;
    const classScopes = await this.classScopesFor(sub.user_id, sub.problem_id);
    let updated = 0;
    for (const { skill_id } of tags) {
      const global = await this.db.skillMastery.findUnique({
        where: { student_id_skill_id_scope: { student_id: sub.user_id, skill_id, scope: GLOBAL } },
      });
      const globalBefore = global?.p_mastery ?? this.params.pInit;
      await this.applyEvidence(sub.user_id, skill_id, GLOBAL, globalBefore, global, correct);
      updated++;
      for (const scope of classScopes) {
        const row = await this.db.skillMastery.findUnique({
          where: { student_id_skill_id_scope: { student_id: sub.user_id, skill_id, scope } },
        });
        // Lần đầu tính trong lớp: xuất phát từ điểm chung (trước bài này) để lớp ít dữ liệu không bị lệch
        await this.applyEvidence(sub.user_id, skill_id, scope, row?.p_mastery ?? globalBefore, row, correct);
        updated++;
      }
    }
    return { updated };
  }

  private async applyEvidence(
    studentId: string,
    skillId: string,
    scope: string,
    before: number,
    existing: { attempts: number; correct: number } | null,
    correct: boolean,
  ) {
    const after = bktUpdate(before, correct, this.params);
    await this.db.skillMastery.upsert({
      where: { student_id_skill_id_scope: { student_id: studentId, skill_id: skillId, scope } },
      create: { student_id: studentId, skill_id: skillId, scope, p_mastery: after, attempts: 1, correct: correct ? 1 : 0 },
      update: {
        p_mastery: after,
        attempts: (existing?.attempts ?? 0) + 1,
        correct: (existing?.correct ?? 0) + (correct ? 1 : 0),
      },
    });
  }

  // ─── Tính lại toàn bộ + đánh giá (AUC/F1/Accuracy như bài báo) ───────────

  /**
   * Phát lại toàn bộ lịch sử nộp bài theo thời gian. Với mỗi lần nộp đầu của một bài có nhãn,
   * dự đoán xác suất làm đúng TRƯỚC khi cập nhật (trung bình theo các kỹ năng của bài), rồi so với kết quả thật.
   * write = true thì ghi lại toàn bộ điểm (dùng sau khi đổi nhãn hoặc lần đầu bật tính năng).
   */
  async replayHistory(write: boolean) {
    const tags = await this.db.problemSkill.findMany({ where: { approved: true }, select: { problem_id: true, skill_id: true } });
    const skillsByProblem = new Map<string, string[]>();
    for (const t of tags) skillsByProblem.set(t.problem_id, [...(skillsByProblem.get(t.problem_id) ?? []), t.skill_id]);
    const problemIds = [...skillsByProblem.keys()];
    if (problemIds.length === 0) {
      if (write) await this.db.skillMastery.deleteMany({});
      return { evaluated: 0, students: 0, auc: null, accuracy: null, f1: null, positive_rate: null, majority_accuracy: null, tagged_problems: 0, learning_curve: [] };
    }

    const subs = await this.db.submission.findMany({
      where: { problem_id: { in: problemIds }, status: { in: EVIDENCE_STATUSES }, user: { role: 'STUDENT' } },
      select: { user_id: true, problem_id: true, status: true, created_at: true },
      orderBy: { created_at: 'asc' },
    });

    // Lớp của từng sinh viên + bài thuộc lớp
    const [memberships, homeworks, contestProblems] = await Promise.all([
      this.db.classStudent.findMany({ select: { class_id: true, student_id: true } }),
      this.db.homework.findMany({ select: { class_id: true, tasks: true } }),
      this.db.contestProblem.findMany({ select: { problem_id: true, contest: { select: { class_id: true } } } }),
    ]);
    const classesOfStudent = new Map<string, Set<string>>();
    for (const m of memberships) {
      if (!classesOfStudent.has(m.student_id)) classesOfStudent.set(m.student_id, new Set());
      classesOfStudent.get(m.student_id)!.add(m.class_id);
    }
    const classesOfProblem = new Map<string, Set<string>>();
    const link = (pid: string, cid: string) => {
      if (!classesOfProblem.has(pid)) classesOfProblem.set(pid, new Set());
      classesOfProblem.get(pid)!.add(cid);
    };
    for (const h of homeworks) problemIdsOfTasks(h.tasks).forEach((pid) => link(pid, h.class_id));
    for (const cp of contestProblems) if (cp.contest.class_id) link(cp.problem_id, cp.contest.class_id);

    type Cell = { p: number; attempts: number; correct: number };
    const state = new Map<string, Cell>(); // key: student|skill|scope
    const seenFirst = new Set<string>();
    const samples: Array<{ pred: number; actual: boolean }> = [];
    const curve = new Map<number, { n: number; errors: number }>(); // lần thử thứ k của một kỹ năng → tỉ lệ sai
    const students = new Set<string>();

    for (const s of subs) {
      const firstKey = `${s.user_id}|${s.problem_id}`;
      if (seenFirst.has(firstKey)) continue;
      seenFirst.add(firstKey);
      students.add(s.user_id);
      const skillIds = skillsByProblem.get(s.problem_id) ?? [];
      const correct = s.status === SubmissionStatus.ACCEPTED;

      const preds = skillIds.map((k) => bktPredictCorrect(state.get(`${s.user_id}|${k}|${GLOBAL}`)?.p ?? this.params.pInit, this.params));
      samples.push({ pred: preds.reduce((a, b) => a + b, 0) / preds.length, actual: correct });

      const scopes = [...(classesOfProblem.get(s.problem_id) ?? [])].filter((c) => classesOfStudent.get(s.user_id)?.has(c));
      for (const k of skillIds) {
        const gKey = `${s.user_id}|${k}|${GLOBAL}`;
        const g = state.get(gKey) ?? { p: this.params.pInit, attempts: 0, correct: 0 };
        const gBefore = g.p;
        const attemptNo = g.attempts + 1;
        const c = curve.get(attemptNo) ?? { n: 0, errors: 0 };
        c.n++;
        if (!correct) c.errors++;
        curve.set(attemptNo, c);
        state.set(gKey, { p: bktUpdate(g.p, correct, this.params), attempts: g.attempts + 1, correct: g.correct + (correct ? 1 : 0) });
        for (const scope of scopes) {
          const key = `${s.user_id}|${k}|${scope}`;
          const cur = state.get(key) ?? { p: gBefore, attempts: 0, correct: 0 };
          state.set(key, { p: bktUpdate(cur.p, correct, this.params), attempts: cur.attempts + 1, correct: cur.correct + (correct ? 1 : 0) });
        }
      }
    }

    if (write) {
      await this.db.skillMastery.deleteMany({});
      const rows = [...state.entries()].map(([key, v]) => {
        const [student_id, skill_id, scope] = key.split('|');
        return { student_id, skill_id, scope, p_mastery: v.p, attempts: v.attempts, correct: v.correct };
      });
      for (let i = 0; i < rows.length; i += 1000) {
        await this.db.skillMastery.createMany({ data: rows.slice(i, i + 1000) });
      }
    }

    const metrics = classificationMetrics(samples);
    const posRate = metrics.positive_rate ?? 0;
    return {
      evaluated: samples.length,
      students: students.size,
      tagged_problems: problemIds.length,
      auc: computeAuc(samples),
      accuracy: metrics.accuracy,
      f1: metrics.f1,
      positive_rate: metrics.positive_rate,
      /** mốc so sánh "Majority" như bài báo: luôn đoán nhãn chiếm đa số */
      majority_accuracy: samples.length ? Math.max(posRate, 1 - posRate) : null,
      learning_curve: [...curve.entries()]
        .sort((a, b) => a[0] - b[0])
        .slice(0, 10)
        .map(([attempt, v]) => ({ attempt, n: v.n, error_rate: v.errors / v.n })),
    };
  }

  // ─── Đọc dữ liệu cho giao diện ───────────────────────────────────────────

  async getStudentMastery(studentId: string, scope = GLOBAL) {
    const [catalog, rows] = await Promise.all([
      this.listCatalog(),
      this.db.skillMastery.findMany({ where: { student_id: studentId, scope } }),
    ]);
    const byId = new Map(rows.map((r) => [r.skill_id, r]));
    return {
      scope,
      params: this.params,
      skills: catalog
        .map((s) => {
          const r = byId.get(s.id);
          return {
            code: s.code,
            name_vi: s.name_vi,
            name_en: s.name_en,
            category: s.category,
            p_mastery: r?.p_mastery ?? null,
            attempts: r?.attempts ?? 0,
            correct: r?.correct ?? 0,
            level: r ? masteryLevel(r.p_mastery, r.attempts) : 'insufficient',
          };
        }),
    };
  }

  /** Lớp mà sinh viên đang học (để chọn xem điểm theo lớp). */
  async getStudentClasses(studentId: string) {
    const rows = await this.db.classStudent.findMany({
      where: { student_id: studentId },
      select: { class: { select: { id: true, name: true, subject: true } } },
    });
    return rows.map((r) => r.class);
  }

  /** Gợi ý bài nên làm tiếp: bài có nhãn kỹ năng còn yếu, sinh viên chưa làm đúng. */
  async getRecommendations(studentId: string, limit = 6) {
    const rows = await this.db.skillMastery.findMany({
      where: { student_id: studentId, scope: GLOBAL },
      include: { skill: true },
    });
    const weak = rows.filter((r) => r.p_mastery < 0.7).sort((a, b) => a.p_mastery - b.p_mastery);
    const attempted = new Set(rows.map((r) => r.skill_id));
    const solved = await this.db.submission.findMany({
      where: { user_id: studentId, status: SubmissionStatus.ACCEPTED },
      select: { problem_id: true },
      distinct: ['problem_id'],
    });
    const solvedIds = new Set(solved.map((s) => s.problem_id));

    const pickFrom = async (skillIds: string[], why: (code: string) => string) => {
      if (skillIds.length === 0) return [];
      const tagged = await this.db.problemSkill.findMany({
        where: { approved: true, skill_id: { in: skillIds }, problem: { in_bank: true } },
        include: { problem: { select: { id: true, title: true, difficulty: true } }, skill: true },
      });
      return tagged
        .filter((t) => !solvedIds.has(t.problem_id))
        .sort((a, b) => skillIds.indexOf(a.skill_id) - skillIds.indexOf(b.skill_id))
        .map((t) => ({
          problem_id: t.problem.id,
          title: t.problem.title,
          difficulty: t.problem.difficulty,
          skill_code: t.skill.code,
          skill_name_vi: t.skill.name_vi,
          skill_name_en: t.skill.name_en,
          reason: why(t.skill.code),
        }));
    };

    let list = await pickFrom(weak.map((w) => w.skill_id), () => 'weak');
    if (list.length < limit) {
      const catalog = await this.listCatalog();
      const fresh = catalog.filter((s) => !attempted.has(s.id)).map((s) => s.id);
      list = [...list, ...(await pickFrom(fresh, () => 'new'))];
    }
    const seen = new Set<string>();
    return list.filter((x) => (seen.has(x.problem_id) ? false : (seen.add(x.problem_id), true))).slice(0, limit);
  }

  /**
   * Bảng nhiệt kỹ năng của lớp cho giảng viên + điểm lớp thang 10.
   * Trọng số kỹ năng = tổng điểm các bài trong lớp có gắn kỹ năng đó (bài kỳ thi tính 10).
   * Kỹ năng sinh viên chưa làm trong lớp: dùng điểm chung nếu có, không thì điểm xuất phát P(L0).
   */
  async getClassHeatmap(classId: string, instructorId: string) {
    const cls = await this.db.class.findUnique({
      where: { id: classId },
      select: { id: true, name: true, admin_id: true },
    });
    if (!cls) throw new NotFoundException('Không tìm thấy lớp học');
    if (cls.admin_id !== instructorId) throw new ForbiddenException('Bạn không quản lý lớp học này');

    const [homeworks, contestProblems, members] = await Promise.all([
      this.db.homework.findMany({ where: { class_id: classId }, select: { tasks: true } }),
      this.db.contestProblem.findMany({ where: { contest: { class_id: classId } }, select: { problem_id: true } }),
      this.db.classStudent.findMany({
        where: { class_id: classId },
        select: { student: { select: { id: true, username: true, full_name: true, email: true, student_code: true } } },
      }),
    ]);
    const points = new Map<string, number>();
    for (const h of homeworks) for (const [pid, pts] of taskPoints(h.tasks)) points.set(pid, (points.get(pid) ?? 0) + pts);
    for (const c of contestProblems) points.set(c.problem_id, (points.get(c.problem_id) ?? 0) + 10);
    const problemIds = [...points.keys()];

    const tags = problemIds.length
      ? await this.db.problemSkill.findMany({
          where: { problem_id: { in: problemIds }, approved: true },
          include: { skill: true },
        })
      : [];
    const weight = new Map<string, number>();
    const skillInfo = new Map<string, (typeof tags)[number]['skill']>();
    for (const t of tags) {
      weight.set(t.skill_id, (weight.get(t.skill_id) ?? 0) + (points.get(t.problem_id) ?? 10));
      skillInfo.set(t.skill_id, t.skill);
    }
    const skillIds = [...weight.keys()].sort((a, b) => (skillInfo.get(a)!.sort ?? 0) - (skillInfo.get(b)!.sort ?? 0));
    const untaggedProblems = problemIds.filter((pid) => !tags.some((t) => t.problem_id === pid)).length;

    const studentIds = members.map((m) => m.student.id);
    const masteries = studentIds.length && skillIds.length
      ? await this.db.skillMastery.findMany({
          where: { student_id: { in: studentIds }, skill_id: { in: skillIds }, scope: { in: [classId, GLOBAL] } },
        })
      : [];
    const cell = new Map<string, (typeof masteries)[number]>();
    for (const m of masteries) cell.set(`${m.student_id}|${m.skill_id}|${m.scope}`, m);

    const totalWeight = skillIds.reduce((s, k) => s + (weight.get(k) ?? 0), 0);
    const students = members.map(({ student }) => {
      let weighted = 0;
      const cells: Record<string, { p: number; attempts: number; level: string; from: 'class' | 'global' | 'prior' }> = {};
      for (const k of skillIds) {
        const inClass = cell.get(`${student.id}|${k}|${classId}`);
        const global = cell.get(`${student.id}|${k}|${GLOBAL}`);
        const p = inClass?.p_mastery ?? global?.p_mastery ?? this.params.pInit;
        const attempts = inClass?.attempts ?? 0;
        cells[skillInfo.get(k)!.code] = {
          p,
          attempts,
          level: masteryLevel(p, attempts),
          from: inClass ? 'class' : global ? 'global' : 'prior',
        };
        weighted += p * (weight.get(k) ?? 0);
      }
      return {
        id: student.id,
        username: student.username ?? student.email.split('@')[0],
        full_name: student.full_name,
        student_code: student.student_code,
        score10: totalWeight ? Math.round((weighted / totalWeight) * 100) / 10 : null,
        cells,
      };
    });

    const skills = skillIds.map((k) => {
      const s = skillInfo.get(k)!;
      const ps = students.map((st) => st.cells[s.code].p);
      return {
        code: s.code,
        name_vi: s.name_vi,
        name_en: s.name_en,
        category: s.category,
        weight: weight.get(k) ?? 0,
        class_avg: ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null,
      };
    });

    return {
      class_id: cls.id,
      class_name: cls.name,
      problems: problemIds.length,
      untagged_problems: untaggedProblems,
      skills,
      students: students.sort((a, b) => (a.score10 ?? 0) - (b.score10 ?? 0)),
    };
  }
}
