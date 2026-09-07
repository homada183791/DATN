import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useClassesQuery } from '../api/classes';

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
  username: string;
  fullName: string;
  rating?: number;
  solvedCount?: number;
}

interface Stored {
  classes: ClassInfo[];
  members: Record<string, Member[]>;
}

interface ClassContextType {
  allClasses: ClassInfo[];
  myClasses: ClassInfo[];          // giảng viên: lớp mình tạo
  enrolledClasses: ClassInfo[];    // sinh viên: lớp đã tham gia
  membersOf: (classId: string) => Member[];
  isEnrolled: (classId: string) => boolean;
  createClass: (data: { name: string; semester: string; description: string }) => ClassInfo;
  deleteClass: (classId: string) => void;
  joinByCode: (code: string) => { ok: boolean; message: string; classId?: string };
  leaveClass: (classId: string) => void;
  removeMember: (classId: string, username: string) => void;
}

const ClassContext = createContext<ClassContextType | undefined>(undefined);

const LS_KEY = 'jh-class-store-v1';

function loadStore(): Stored {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as Stored;
  } catch { /* ignore */ }
  return { classes: [], members: {} };
}

export function ClassProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: apiClasses = [] } = useClassesQuery();
  const [store, setStore] = useState<Stored>(loadStore);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(store));
  }, [store]);

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
  const allClasses = useMemo(() => [...serverClasses, ...store.classes], [serverClasses, store.classes]);

  const membersOf = (classId: string): Member[] => {
    return store.members[classId] ?? [];
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
  }, [allClasses, user, store.members]);

  const createClass: ClassContextType['createClass'] = (data) => {
    const cls: ClassInfo = {
      id: `CL${Date.now()}`,
      name: data.name,
      code: `INT${Math.floor(1000 + Math.random() * 9000)}`,
      instructor: user?.fullName ?? 'Giảng viên',
      semester: data.semester,
      studentCount: 1,
      homeworkCount: 0,
      contestCount: 0,
      description: data.description,
    };
    setStore((s) => ({
      ...s,
      classes: [...s.classes, cls],
      members: {
        ...s.members,
        [cls.id]: user ? [{ username: user.username, fullName: user.fullName }] : [],
      },
    }));
    return cls;
  };

  const deleteClass = (classId: string) => {
    setStore((s) => {
      const members = { ...s.members };
      delete members[classId];
      return { classes: s.classes.filter((c) => c.id !== classId), members };
    });
  };

  const joinByCode: ClassContextType['joinByCode'] = (code) => {
    if (!user) return { ok: false, message: 'Cần đăng nhập để tham gia lớp.' };
    const cls = allClasses.find((c) => c.code.toLowerCase() === code.trim().toLowerCase());
    if (!cls) return { ok: false, message: `Không tìm thấy lớp với mã "${code}".` };
    if (isEnrolled(cls.id)) return { ok: false, message: `Bạn đã là thành viên của "${cls.name}".`, classId: cls.id };
    setStore((s) => ({
      ...s,
      members: {
        ...s.members,
        [cls.id]: [...(s.members[cls.id] ?? []), { username: user.username, fullName: user.fullName }],
      },
    }));
    return { ok: true, message: `Đã tham gia lớp "${cls.name}".`, classId: cls.id };
  };

  const leaveClass = (classId: string) => {
    if (!user) return;
    setStore((s) => ({
      ...s,
      members: {
        ...s.members,
        [classId]: (s.members[classId] ?? []).filter((m) => m.username !== user.username),
      },
    }));
  };

  const removeMember = (classId: string, username: string) => {
    setStore((s) => ({
      ...s,
      members: {
        ...s.members,
        [classId]: (s.members[classId] ?? []).filter((m) => m.username !== username),
      },
    }));
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
