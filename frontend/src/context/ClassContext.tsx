import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { createClass as createClassApi, deleteClass as deleteClassApi, removeClassStudent, useClassesQuery } from '../api/classes';
import { apiFetch } from '../api/http';

export interface ClassInfo {
  id: string;
  name: string;
  code: string;
  instructor: string;
  semester: string;
  studentCount: number;
  homeworkCount: number;
  contestCount: number;
  description: string;
}

export interface Member {
  id: string;
  username: string;
  fullName: string;
  rating?: number;
  solvedCount?: number;
}

interface ClassContextType {
  allClasses: ClassInfo[];
  myClasses: ClassInfo[];          // giảng viên: lớp mình tạo
  enrolledClasses: ClassInfo[];    // sinh viên: lớp đã tham gia
  membersOf: (classId: string) => Member[];
  isEnrolled: (classId: string) => boolean;
  createClass: (data: { name: string; semester: string; description: string }) => Promise<ClassInfo>;
  deleteClass: (classId: string) => Promise<void>;
  joinByCode: (code: string) => Promise<{ ok: boolean; message: string; classId?: string }>;
  leaveClass: (classId: string) => Promise<void>;
  removeMember: (classId: string, username: string) => Promise<void>;
}

const ClassContext = createContext<ClassContextType | undefined>(undefined);

export function ClassProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: apiClasses = [] } = useClassesQuery();

  const serverClasses = useMemo(() => apiClasses.map((cls) => ({
    id: cls.id,
    name: cls.name,
    code: cls.invite_code,
    instructor: cls.admin?.email ?? '',
    semester: '',
    studentCount: cls.students?.length ?? 0,
    homeworkCount: 0,
    contestCount: 0,
    description: cls.description ?? '',
  })), [apiClasses]);
  const allClasses = serverClasses;

  const membersOf = (classId: string): Member[] => {
    const cls = apiClasses.find((item) => item.id === classId);
    return (cls?.students ?? []).map(({ student }) => ({
      id: student.id,
      username: student.email.split('@')[0],
      fullName: student.email,
    }));
  };

  const isEnrolled = (classId: string) =>
    !!user && membersOf(classId).some((m) => m.username === user.username);

  const myClasses = useMemo(() => {
    if (user?.role !== 'instructor') return [];
    return allClasses.filter((c) => c.instructor === user.email || c.instructor === user.fullName);
  }, [allClasses, user]);

  const enrolledClasses = useMemo(() => {
    if (user?.role !== 'student') return [];
    return allClasses.filter((c) => isEnrolled(c.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allClasses, user, apiClasses]);

  const createClass: ClassContextType['createClass'] = async (data) => {
    const created = await createClassApi({ name: data.name, description: data.description });
    await queryClient.invalidateQueries({ queryKey: ['classes'] });
    return {
      id: created.id,
      name: created.name,
      code: created.invite_code,
      instructor: created.admin?.email ?? user?.email ?? '',
      semester: data.semester,
      studentCount: created.students?.length ?? 0,
      homeworkCount: 0,
      contestCount: 0,
      description: created.description ?? '',
    };
  };

  const deleteClass: ClassContextType['deleteClass'] = async (classId) => {
    await deleteClassApi(classId);
    await queryClient.invalidateQueries({ queryKey: ['classes'] });
  };

  const joinByCode: ClassContextType['joinByCode'] = async (code) => {
    if (!user) return { ok: false, message: 'Cần đăng nhập để tham gia lớp.' };
    const cls = allClasses.find((c) => c.code.toLowerCase() === code.trim().toLowerCase());
    if (!cls) return { ok: false, message: `Không tìm thấy lớp với mã "${code}".` };
    if (isEnrolled(cls.id)) return { ok: false, message: `Bạn đã là thành viên của "${cls.name}".`, classId: cls.id };
    await apiFetch(`/api/v1/classes/${cls.id}/join`, { method: 'POST' });
    await queryClient.invalidateQueries({ queryKey: ['classes'] });
    return { ok: true, message: `Đã tham gia lớp "${cls.name}".`, classId: cls.id };
  };

  const leaveClass: ClassContextType['leaveClass'] = async (classId) => {
    if (!user) return;
    await apiFetch(`/api/v1/classes/${classId}/leave`, { method: 'DELETE' });
    await queryClient.invalidateQueries({ queryKey: ['classes'] });
  };

  const removeMember: ClassContextType['removeMember'] = async (classId, username) => {
    const member = membersOf(classId).find((item) => item.username === username);
    if (!member) return;
    await removeClassStudent(classId, member.id);
    await queryClient.invalidateQueries({ queryKey: ['classes'] });
  };

  return (
    <ClassContext.Provider
      value={{ allClasses, myClasses, enrolledClasses, membersOf, isEnrolled, createClass, deleteClass, joinByCode, leaveClass, removeMember }}
    >
      {children}
    </ClassContext.Provider>
  );
}

export function useClass() {
  const ctx = useContext(ClassContext);
  if (!ctx) throw new Error('useClass must be used within ClassProvider');
  return ctx;
}
