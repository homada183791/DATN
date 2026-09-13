import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useHomeworkMutations, useHomeworksQuery, HomeworkTaskDto } from '../api/homeworks';
import { datetimeLocalToISO } from '../utils/dateTime';

export interface Homework {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: 'active' | 'closed' | 'upcoming';
  problemCount: number;
  completedCount: number;
  classId: string;
  className: string;
  totalStudents: number;
  submittedStudents: number;
  tasks: HomeworkProblem[];
}

export type HomeworkProblem = HomeworkTaskDto;

export type HomeworkInput = {
  title: string;
  description: string;
  deadline: string;
  problems: HomeworkProblem[];
  classId: string;
  className: string;
  totalStudents: number;
};

interface HomeworkContextType {
  allHomeworks: Homework[];
  isLoading: boolean;
  refetch: () => Promise<any>;
  homeworksOfClass: (classId: string) => Homework[];
  problemsOf: (homeworkId: string) => HomeworkProblem[];
  createHomework: (data: HomeworkInput) => Promise<Homework>;
  updateHomework: (id: string, data: Partial<HomeworkInput>) => Promise<void>;
  deleteHomework: (id: string) => Promise<void>;
}

const HomeworkContext = createContext<HomeworkContextType | undefined>(undefined);

function computeStatus(deadline: string): Homework['status'] {
  const timestamp = new Date(deadline).getTime();
  return Number.isNaN(timestamp) ? 'active' : timestamp < Date.now() ? 'closed' : 'active';
}

function normalizeHomework(item: {
  id: string;
  title: string;
  description?: string | null;
  deadline: string;
  class_id: string;
  tasks?: HomeworkProblem[] | null;
  class?: { name: string; students?: Array<{ student_id: string }> };
}): Homework {
  const tasks = Array.isArray(item.tasks) ? item.tasks : [];
  return {
    id: item.id,
    title: item.title,
    description: item.description ?? '',
    deadline: item.deadline,
    status: computeStatus(item.deadline),
    problemCount: tasks.length,
    completedCount: 0,
    classId: item.class_id,
    className: item.class?.name ?? '',
    totalStudents: item.class?.students?.length ?? 0,
    submittedStudents: 0,
    tasks,
  };
}

export function HomeworkProvider({ children }: { children: ReactNode }) {
  const { data = [], isLoading, refetch } = useHomeworksQuery();
  const mutations = useHomeworkMutations();
  const allHomeworks = useMemo(() => data.map(normalizeHomework), [data]);

  const homeworksOfClass = (classId: string) => allHomeworks.filter((item) => item.classId === classId);
  const problemsOf = (homeworkId: string) => allHomeworks.find((item) => item.id === homeworkId)?.tasks ?? [];

  const createHomework: HomeworkContextType['createHomework'] = async (input) => {
    const created = await mutations.create({
      title: input.title,
      description: input.description,
      // input.deadline là giá trị từ input[datetime-local] → coi là UTC+7 → convert sang ISO UTC
      deadline: datetimeLocalToISO(input.deadline),
      class_id: input.classId,
      tasks: input.problems,
    });
    return normalizeHomework(created);
  };

  const updateHomework: HomeworkContextType['updateHomework'] = async (id, input) => {
    await mutations.update(id, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      // input.deadline là giá trị từ input[datetime-local] → coi là UTC+7 → convert sang ISO UTC
      ...(input.deadline !== undefined ? { deadline: datetimeLocalToISO(input.deadline) } : {}),
      ...(input.classId !== undefined ? { class_id: input.classId } : {}),
      ...(input.problems !== undefined ? { tasks: input.problems } : {}),
    });
  };

  return (
    <HomeworkContext.Provider value={{ allHomeworks, isLoading, refetch, homeworksOfClass, problemsOf, createHomework, updateHomework, deleteHomework: mutations.remove }}>
      {children}
    </HomeworkContext.Provider>
  );
}

export function useHomework() {
  const context = useContext(HomeworkContext);
  if (!context) throw new Error('useHomework must be used within HomeworkProvider');
  return context;
}

export function deadlineProgress(deadline: string, createdWindowDays = 14) {
  const timestamp = new Date(deadline.replace(' ', 'T')).getTime();
  if (Number.isNaN(timestamp)) return { pct: 0, daysLeft: 0, overdue: false, label: '—' };
  const now = Date.now();
  const start = timestamp - createdWindowDays * 86400000;
  const pct = Math.max(0, Math.min(100, ((now - start) / (timestamp - start)) * 100));
  const daysLeft = Math.ceil((timestamp - now) / 86400000);
  const overdue = timestamp < now;
  const label = overdue ? 'Đã quá hạn' : daysLeft <= 0 ? 'Hết hạn hôm nay' : daysLeft === 1 ? 'Còn 1 ngày' : `Còn ${daysLeft} ngày`;
  return { pct, daysLeft, overdue, label };
}
