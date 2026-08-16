import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { homeworks as mockHomeworks, Homework } from '../data/legacyData';

export interface HomeworkProblem {
  id: string;
  title: string;
  statement: string;              // đề bài (markdown/plain)
  difficulty: 'Easy' | 'Medium' | 'Hard';
  points: number;
  sampleInput?: string;
  sampleOutput?: string;
}

export type HomeworkInput = {
  title: string;
  description: string;
  deadline: string;              // 'YYYY-MM-DD HH:mm'
  problems: HomeworkProblem[];
  classId: string;
  className: string;
  totalStudents: number;
};

interface HomeworkContextType {
  allHomeworks: Homework[];
  homeworksOfClass: (classId: string) => Homework[];
  problemsOf: (homeworkId: string) => HomeworkProblem[];
  createHomework: (data: HomeworkInput) => Homework;
  updateHomework: (id: string, data: Partial<HomeworkInput>) => void;
  deleteHomework: (id: string) => void;
}

const HomeworkContext = createContext<HomeworkContextType | undefined>(undefined);

const LS_KEY = 'jh-homework-store-v2';
const LS_DELETED = 'jh-homework-deleted-v2';
const LS_PATCH = 'jh-homework-patch-v2';
const LS_PROBLEMS = 'jh-homework-problems-v2';

function computeStatus(deadline: string): Homework['status'] {
  const now = Date.now();
  const dl = new Date(deadline.replace(' ', 'T')).getTime();
  if (isNaN(dl)) return 'active';
  return dl < now ? 'closed' : 'active';
}

/* Tạo đề mẫu cho các bài tập seed để giảng viên có sẵn dữ liệu chỉnh sửa */
function seedProblems(hw: Homework): HomeworkProblem[] {
  return Array.from({ length: hw.problemCount }, (_, i) => ({
    id: `${hw.id}-P${i + 1}`,
    title: `Bài ${i + 1}`,
    statement: 'Đề bài chưa được biên soạn. Nhấn "Sửa" để bổ sung nội dung.',
    difficulty: (['Easy', 'Medium', 'Hard'] as const)[i % 3],
    points: 100,
  }));
}

export function HomeworkProvider({ children }: { children: ReactNode }) {
  const [custom, setCustom] = useState<Homework[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
  });
  const [deleted, setDeleted] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_DELETED) || '[]'); } catch { return []; }
  });
  const [patches, setPatches] = useState<Record<string, Partial<Homework>>>(() => {
    try { return JSON.parse(localStorage.getItem(LS_PATCH) || '{}'); } catch { return {}; }
  });
  const [problemStore, setProblemStore] = useState<Record<string, HomeworkProblem[]>>(() => {
    try { return JSON.parse(localStorage.getItem(LS_PROBLEMS) || '{}'); } catch { return {}; }
  });

  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(custom)); }, [custom]);
  useEffect(() => { localStorage.setItem(LS_DELETED, JSON.stringify(deleted)); }, [deleted]);
  useEffect(() => { localStorage.setItem(LS_PATCH, JSON.stringify(patches)); }, [patches]);
  useEffect(() => { localStorage.setItem(LS_PROBLEMS, JSON.stringify(problemStore)); }, [problemStore]);

  const allHomeworks = useMemo(() => {
    const base = mockHomeworks
      .filter((h) => !deleted.includes(h.id))
      .map((h) => (patches[h.id] ? { ...h, ...patches[h.id] } : h));
    return [...base, ...custom];
  }, [custom, deleted, patches]);

  const homeworksOfClass = (classId: string) => allHomeworks.filter((h) => h.classId === classId);

  const problemsOf = (homeworkId: string): HomeworkProblem[] => {
    if (problemStore[homeworkId]) return problemStore[homeworkId];
    const hw = allHomeworks.find((h) => h.id === homeworkId);
    return hw ? seedProblems(hw) : [];
  };

  const createHomework: HomeworkContextType['createHomework'] = (data) => {
    const id = `H${Date.now()}`;
    const hw: Homework = {
      id,
      title: data.title,
      description: data.description,
      deadline: data.deadline,
      status: computeStatus(data.deadline),
      problemCount: data.problems.length,
      completedCount: 0,
      classId: data.classId,
      className: data.className,
      totalStudents: data.totalStudents,
      submittedStudents: 0,
    };
    setCustom((c) => [...c, hw]);
    setProblemStore((p) => ({ ...p, [id]: data.problems }));
    return hw;
  };

  const updateHomework: HomeworkContextType['updateHomework'] = (id, data) => {
    const patch: Partial<Homework> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.deadline !== undefined) { patch.deadline = data.deadline; patch.status = computeStatus(data.deadline); }
    if (data.className !== undefined) patch.className = data.className;
    if (data.classId !== undefined) patch.classId = data.classId;
    if (data.totalStudents !== undefined) patch.totalStudents = data.totalStudents;
    if (data.problems !== undefined) {
      patch.problemCount = data.problems.length;
      setProblemStore((p) => ({ ...p, [id]: data.problems! }));
    }
    if (custom.some((h) => h.id === id)) {
      setCustom((c) => c.map((h) => (h.id === id ? { ...h, ...patch } : h)));
    } else {
      setPatches((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
    }
  };

  const deleteHomework: HomeworkContextType['deleteHomework'] = (id) => {
    if (custom.some((h) => h.id === id)) {
      setCustom((c) => c.filter((h) => h.id !== id));
    } else {
      setDeleted((d) => [...d, id]);
    }
    setProblemStore((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
  };

  return (
    <HomeworkContext.Provider value={{ allHomeworks, homeworksOfClass, problemsOf, createHomework, updateHomework, deleteHomework }}>
      {children}
    </HomeworkContext.Provider>
  );
}

export function useHomework() {
  const ctx = useContext(HomeworkContext);
  if (!ctx) throw new Error('useHomework must be used within HomeworkProvider');
  return ctx;
}

/** Tính % thời gian đã trôi qua tới deadline (0-100) + số ngày còn lại */
export function deadlineProgress(deadline: string, createdWindowDays = 14) {
  const dl = new Date(deadline.replace(' ', 'T')).getTime();
  if (isNaN(dl)) return { pct: 0, daysLeft: 0, overdue: false, label: '—' };
  const now = Date.now();
  const start = dl - createdWindowDays * 86400000;
  const pct = Math.max(0, Math.min(100, ((now - start) / (dl - start)) * 100));
  const msLeft = dl - now;
  const daysLeft = Math.ceil(msLeft / 86400000);
  const overdue = msLeft < 0;
  let label: string;
  if (overdue) label = 'Đã quá hạn';
  else if (daysLeft <= 0) label = 'Hết hạn hôm nay';
  else if (daysLeft === 1) label = 'Còn 1 ngày';
  else label = `Còn ${daysLeft} ngày`;
  return { pct, daysLeft, overdue, label };
}
