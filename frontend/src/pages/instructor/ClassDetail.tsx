import { useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  useClassDetailQuery,
  removeClassStudent,
  updateClass as updateClassApi,
  addStudentToClass as addStudentApi,
  useClassGradebookQuery,
  useClassRosterQuery,
  uploadClassRoster,
  clearClassRoster,
  type ClassGradebookDto,
  type ClassGradebookStudent,
  type ClassGradeItem,
} from '../../api/classes';
import { useClassHomeworksQuery } from '../../api/homeworks';
import SubmissionDetailModal from '../../components/SubmissionDetailModal';
import { useHomework, deadlineProgress, HomeworkProblem } from '../../context/HomeworkContext';
import { formatVN, formatVNFull, toDatetimeLocal } from '../../utils/dateTime';
import ProblemManager from '../../components/ProblemManager';
import { parseRosterCsv, RosterCsvError } from '../../utils/rosterCsv';
import { notifyGlobalToast } from '../../context/ToastContext';
import ClassSkillHeatmap from '../../components/skills/ClassSkillHeatmap';
import {
  GraduationCap,
  Users,
  ClipboardList,
  Calendar,
  Hash,
  Check,
  Link2,
  Plus,
  Search,
  ArrowLeft,
  Trash2,
  Eye,
  X,
  Clock,
  ArrowUpDown,
  BookOpen,
  UserX,
  Copy,
  Edit3,
  UserPlus,
  Upload,
  Download,
  RotateCcw,
  Award,
  Lock,
 Brain,} from 'lucide-react';

// Họ và tên hiển thị trong sổ điểm: ưu tiên Họ và tên, chưa có thì dùng Tên đăng nhập
function gradebookStudentName(st: { full_name?: string | null; username?: string | null; email?: string | null }): string {
  return st.full_name?.trim() || st.username || (st.email ?? '').split('@')[0] || '';
}

// Sắp xếp danh sách sinh viên theo MSSV tăng dần (chưa có MSSV xếp cuối, cùng MSSV thì theo tên)
function sortGradebookStudents<T extends { full_name?: string | null; username?: string | null; email?: string | null; student_code?: string | null }>(students: T[]): T[] {
  return [...students].sort((a, b) => {
    const ca = a.student_code || '';
    const cb = b.student_code || '';
    if (ca && cb && ca !== cb) return ca < cb ? -1 : 1;
    if (ca && !cb) return -1;
    if (!ca && cb) return 1;
    return gradebookStudentName(a).localeCompare(gradebookStudentName(b), 'vi', { sensitivity: 'base' });
  });
}

// Điểm của một sinh viên cho từng bộ bài tập đã giao + tổng điểm của tất cả bộ bài tập.
// Điểm mỗi bài = điểm giảng viên chấm (thang 10) × trọng số; chưa chấm thì AC = full điểm, còn lại theo điểm tự động.
function gradeEarned(g: ClassGradeItem): number {
  if (g.earned_score != null) return g.earned_score;
  const points = Number(g.points) || 0;
  if (g.status === 'NOT_SUBMITTED') return 0;
  if (g.instructor_score != null) return (g.instructor_score / 10) * points;
  if (g.status === 'ACCEPTED') return points;
  return ((g.score || 0) / 100) * points;
}

function fmtScore(n: number): string {
  return String(Math.round(n * 10) / 10);
}

function homeworkScores(gradebook: ClassGradebookDto, st: ClassGradebookStudent) {
  const perHomework = gradebook.homework_columns.map((hw) => {
    const grades = st.grades.filter((g) => g.homework_id === hw.homework_id);
    return {
      id: hw.homework_id,
      earned: grades.reduce((sum, g) => sum + gradeEarned(g), 0),
      total: grades.reduce((sum, g) => sum + (Number(g.points) || 0), 0),
    };
  });
  return {
    perHomework,
    earned: perHomework.reduce((sum, h) => sum + h.earned, 0),
    total: perHomework.reduce((sum, h) => sum + h.total, 0),
  };
}

function exportGradebookCsv(gradebook: ClassGradebookDto) {
  const headers = ['STT', 'MSSV', 'Họ và tên'];
  const allHeaders = [...headers, ...gradebook.homework_columns.map((hw) => hw.homework_title), 'Tổng điểm'];

  const rows = sortGradebookStudents(gradebook.students).map((st, index) => {
    const scores = homeworkScores(gradebook, st);
    const cells = [
      String(index + 1),
      st.student_code ?? '',
      gradebookStudentName(st),
      ...scores.perHomework.map((h) => `${fmtScore(h.earned)}/${fmtScore(h.total)}`),
      `${fmtScore(scores.earned)}/${fmtScore(scores.total)}`,
    ];
    return cells.map((c) => `"${c.replace(/"/g, '""')}"`).join(',');
  });

  const csvContent = '\uFEFF' + [allHeaders.map((h) => `"${h.replace(/"/g, '""')}"`).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `So_diem_${gradebook.class_name.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Hiển thị học kỳ kèm năm học; nếu dữ liệu cũ chưa có năm (vd "Học kỳ 1") thì bổ sung năm học hiện tại.
function formatSemesterWithYear(semester: string): string {
  if (/\d{4}\s*[/-]\s*\d{4}/.test(semester)) return semester;
  const now = new Date();
  const month = now.getMonth() + 1;
  const start = month >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  return `${semester} - ${start}/${start + 1}`;
}

// Computes a sensible "current" semester label (e.g. "Học kỳ 1 - 2026/2027")
// so the edit-class form doesn't default to a permanently stale year.
function getDefaultSemester(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  if (month >= 9) return `Học kỳ 1 - ${year}/${year + 1}`;
  if (month === 1) return `Học kỳ 1 - ${year - 1}/${year}`;
  if (month >= 2 && month <= 6) return `Học kỳ 2 - ${year - 1}/${year}`;
  return `Học kỳ 3 - ${year - 1}/${year}`;
}

// Builds a handful of ready-made suggestions (current + previous academic year)
// offered via <datalist> while still letting the instructor type anything.
function buildSemesterSuggestions(): string[] {
  const now = new Date();
  const month = now.getMonth() + 1;
  const academicStartYear = month >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  const suggestions: string[] = [];
  [academicStartYear - 1, academicStartYear].forEach((y) => {
    suggestions.push(`Học kỳ 1 - ${y}/${y + 1}`);
    suggestions.push(`Học kỳ 2 - ${y}/${y + 1}`);
    suggestions.push(`Học kỳ 3 - ${y}/${y + 1}`);
  });
  return suggestions;
}

export default function InstructorClassDetail() {
  const { t } = useTranslation();
  const semesterSuggestions = buildSemesterSuggestions();
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();

  const { data: classData, isLoading: isClassLoading, refetch: refetchClass } = useClassDetailQuery(classId);
  const { data: apiHomeworks = [], isLoading: isHwLoading, refetch: refetchHw } = useClassHomeworksQuery(classId);
  const { createHomework, updateHomework, deleteHomework } = useHomework();

  // Lưu tab đang xem trên URL (?tab=...) để tải lại trang không bị quay về tab Bài tập
  type ClassTab = 'homework' | 'members' | 'gradebook' | 'skills';
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: ClassTab =
    tabParam === 'members' || tabParam === 'gradebook' || tabParam === 'skills' ? tabParam : 'homework';
  const setActiveTab = (tab: ClassTab) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      },
      { replace: true },
    );
  const { data: gradebookData, isLoading: isGradebookLoading, refetch: refetchGradebook } = useClassGradebookQuery(classId);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<'stt' | 'name_asc' | 'name_desc' | 'rating_desc' | 'subs_desc'>('stt');
  const [copied, setCopied] = useState<string | null>(null);

  // Homework search & filter state
  const [hwSearchQuery, setHwSearchQuery] = useState('');
  const [hwStatusFilter, setHwStatusFilter] = useState<'all' | 'active' | 'overdue'>('all');

  // Homework creation modal state
  const [showCreateHw, setShowCreateHw] = useState(false);
  const [hwForm, setHwForm] = useState({ title: '', description: '', deadline: '' });
  const [hwProblems, setHwProblems] = useState<HomeworkProblem[]>([]);
  const [hwError, setHwError] = useState('');
  const [isSavingHw, setIsSavingHw] = useState(false);

  // Detail & Action modals
  const [editingHwId, setEditingHwId] = useState<string | null>(null); // đang chỉnh sửa bài tập nào (null = giao mới)
  const [confirmDeleteHwId, setConfirmDeleteHwId] = useState<string | null>(null);
  const [confirmKickStudent, setConfirmKickStudent] = useState<{ id: string; name: string } | null>(null);
  const [isKicking, setIsKicking] = useState(false);

  // Edit class state
  const [showEditClass, setShowEditClass] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', subject: '', semester: '', description: '' });
  const [editError, setEditError] = useState('');
  const [isUpdatingClass, setIsUpdatingClass] = useState(false);

  // Add student state
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [addStudentError, setAddStudentError] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  // Danh sách lớp (CSV MSSV)
  const { data: rosterInfo, refetch: refetchRoster } = useClassRosterQuery(classId);
  const [isUploadingRoster, setIsUploadingRoster] = useState(false);
  const [showRosterListModal, setShowRosterListModal] = useState(false);

  const [showRosterModal, setShowRosterModal] = useState(false);
  type RosterFileItem = {
    key: string;
    name: string;
    codes?: string[];
    invalidCount?: number;
    error?: string;
  };
  const [rosterFiles, setRosterFiles] = useState<RosterFileItem[]>([]);
  const [rosterError, setRosterError] = useState('');
  const [isDraggingRoster, setIsDraggingRoster] = useState(false);

  // Gộp MSSV (đã loại trùng) của tất cả các file hợp lệ
  const rosterValidFiles = rosterFiles.filter((f) => f.codes && f.codes.length > 0);
  const rosterAllCodes = [...new Set(rosterValidFiles.flatMap((f) => f.codes ?? []))];
  const rosterInvalidTotal = rosterFiles.reduce((sum, f) => sum + (f.invalidCount ?? 0), 0);

  const resetRosterModal = () => {
    setRosterFiles([]);
    setRosterError('');
    setIsDraggingRoster(false);
  };

  const closeRosterModal = () => {
    setShowRosterModal(false);
    resetRosterModal();
  };

  const pickRosterFiles = async (fileList: FileList | File[] | null | undefined) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;
    setRosterError('');

    const items: RosterFileItem[] = await Promise.all(
      files.map(async (file): Promise<RosterFileItem> => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (!/\.csv$/i.test(file.name)) {
          return { key, name: file.name, error: t('instructorClassDetail.rosterNotCsv') };
        }
        try {
          const parsed = parseRosterCsv(await file.text());
          return { key, name: file.name, codes: parsed.codes, invalidCount: parsed.invalidCount };
        } catch (e: any) {
          return {
            key,
            name: file.name,
            error:
              e instanceof RosterCsvError && e.message === 'NO_COLUMN'
                ? t('instructorClassDetail.rosterNoColumn')
                : t('instructorClassDetail.rosterNoValid'),
          };
        }
      }),
    );

    // Thêm vào danh sách hiện có; file trùng (cùng tên, kích thước) được thay thế
    setRosterFiles((prev) => [...prev.filter((p) => !items.some((i) => i.key === p.key)), ...items]);
  };

  const submitRoster = async () => {
    if (!classId || rosterAllCodes.length === 0) return;
    setIsUploadingRoster(true);
    setRosterError('');
    try {
      const info = await uploadClassRoster(classId, rosterAllCodes);
      await refetchRoster();
      notifyGlobalToast(
        t('instructorClassDetail.rosterUploaded', { count: info.count, invalid: rosterInvalidTotal }),
        'success',
      );
      closeRosterModal();
    } catch (e: any) {
      setRosterError(e?.message || t('instructorClassDetail.rosterUploadFailed'));
    } finally {
      setIsUploadingRoster(false);
    }
  };

  const handleClearRoster = async () => {
    if (!classId) return;
    if (!window.confirm(t('instructorClassDetail.rosterClearConfirm'))) return;
    try {
      await clearClassRoster(classId);
      await refetchRoster();
    } catch (e: any) {
      notifyGlobalToast(e?.message || t('instructorClassDetail.rosterUploadFailed'), 'error');
    }
  };

  const hasDocument = typeof document !== 'undefined';
  // ===== Xem kết quả bài tập đã hết hạn + chấm lại lần nộp gần nhất =====
  const [resultsHwId, setResultsHwId] = useState<string | null>(null);
  const [gradingItem, setGradingItem] = useState<{ student: ClassGradebookStudent; grade: ClassGradeItem } | null>(null);

  const openGrading = (student: ClassGradebookStudent, grade: ClassGradeItem) => {
    if (!grade.latest_submission_id) return;
    setGradingItem({ student, grade });
  };

  const resultsHwColumn = resultsHwId && gradebookData
    ? gradebookData.homework_columns.find((c) => c.homework_id === resultsHwId) ?? null
    : null;
  const resultsHwTitle = resultsHwColumn?.homework_title
    ?? (apiHomeworks as any[]).find((h) => h.id === resultsHwId)?.title
    ?? '';

  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  // Standard clean link display rules:
  const displayCode = classData?.invite_code
    ? (classData.invite_code.length > 10 ? `JH-${classData.invite_code.slice(0, 6).toUpperCase()}` : classData.invite_code.toUpperCase())
    : 'CODE';
  const displayInviteUrl = classData?.invite_code ? `judgehub.edu.vn/join/${displayCode}` : 'judgehub.edu.vn/join';
  const fullInviteUrl = classData?.invite_code ? `${window.location.origin}/join/${classData.invite_code}` : '';

  const activeHwCount = useMemo(() => {
    return apiHomeworks.filter((hw: any) => !deadlineProgress(hw.deadline).overdue).length;
  }, [apiHomeworks]);

  const overdueHwCount = useMemo(() => {
    return apiHomeworks.filter((hw: any) => deadlineProgress(hw.deadline).overdue).length;
  }, [apiHomeworks]);

  const filteredHomeworks = useMemo(() => {
    return apiHomeworks.filter((hw: any) => {
      const q = hwSearchQuery.trim().toLowerCase();
      const matchSearch = !q || hw.title.toLowerCase().includes(q) || (hw.description && hw.description.toLowerCase().includes(q));
      if (!matchSearch) return false;

      const p = deadlineProgress(hw.deadline);
      if (hwStatusFilter === 'active') return !p.overdue;
      if (hwStatusFilter === 'overdue') return p.overdue;
      return true;
    });
  }, [apiHomeworks, hwSearchQuery, hwStatusFilter]);

  // Members list with derived data
  const rawMembers = useMemo(() => {
    if (!classData?.students) return [];
    return classData.students
      .filter((item) => !!item?.student)
      .map((item, index) => {
        const student = item.student;
        const email = student.email || '';
        const displayName = student.full_name?.trim() || student.username || email.split('@')[0] || student.id;
        return {
          stt: index + 1,
          id: student.id,
          email,
          username: student.username || email.split('@')[0] || student.id,
          displayName,
          studentCode: student.student_code || '',
          rating: student.elo_rating ?? 1200,
          submissionsCount: student._count?.submissions ?? 0,
          joinedAt: item.joined_at,
        };
      });
  }, [classData]);

  // Filter & Sort members
  const filteredMembers = useMemo(() => {
    let result = rawMembers;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (m) =>
          m.displayName.toLowerCase().includes(q) ||
          m.studentCode.includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.username.toLowerCase().includes(q)
      );
    }

    const sorted = [...result];
    if (sortKey === 'name_asc') sorted.sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi'));
    else if (sortKey === 'name_desc') sorted.sort((a, b) => b.displayName.localeCompare(a.displayName, 'vi'));
    else if (sortKey === 'rating_desc') sorted.sort((a, b) => b.rating - a.rating);
    else if (sortKey === 'subs_desc') sorted.sort((a, b) => b.submissionsCount - a.submissionsCount);
    // 'stt' preserves original joined index

    return sorted;
  }, [rawMembers, searchQuery, sortKey]);

  // Handle Kick Student
  const handleKickStudent = async () => {
    if (!classId || !confirmKickStudent) return;
    setIsKicking(true);
    try {
      await removeClassStudent(classId, confirmKickStudent.id);
      await refetchClass();
      setConfirmKickStudent(null);
    } catch (e: any) {
      alert(e?.message || t('instructorClassDetail.errors.kickStudentFailed'));
    } finally {
      setIsKicking(false);
    }
  };

  // Handle Save Homework
  const handleSaveHomework = async () => {
    if (!classData) return;
    if (hwForm.title.trim().length < 3) return setHwError(t('instructorClass.errors.titleTooShort'));
    if (!hwForm.deadline) return setHwError(t('instructorClass.errors.deadlineRequired'));
    if (hwProblems.length === 0) return setHwError(t('instructorClass.errors.problemsRequired'));
    setIsSavingHw(true);
    setHwError('');
    try {
      if (editingHwId) {
        await updateHomework(editingHwId, {
          title: hwForm.title.trim(),
          description: hwForm.description.trim(),
          deadline: hwForm.deadline.replace('T', ' '),
          problems: hwProblems,
        });
      } else {
        await createHomework({
          title: hwForm.title.trim(),
          description: hwForm.description.trim(),
          deadline: hwForm.deadline.replace('T', ' '),
          problems: hwProblems,
          classId: classData.id,
          className: `${classData.name} - ${classData.invite_code}`,
          totalStudents: rawMembers.length,
        });
      }
      await refetchHw();
      await refetchClass();
      setShowCreateHw(false);
      setEditingHwId(null);
      setHwForm({ title: '', description: '', deadline: '' });
      setHwProblems([]);
    } catch (e: any) {
      setHwError(e.message || t('instructorClass.errors.assignHomeworkFailed'));
    } finally {
      setIsSavingHw(false);
    }
  };

  // Handle Delete Homework
  const handleDeleteHomework = async (hwId: string) => {
    try {
      await deleteHomework(hwId);
      await refetchHw();
      setConfirmDeleteHwId(null);
    } catch (e: any) {
      alert(e?.message || t('instructorClassDetail.errors.deleteHwFailed'));
    }
  };

  const openEditModal = () => {
    if (!classData) return;
    setEditForm({
      name: classData.name || '',
      subject: classData.subject || '',
      semester: classData.semester || getDefaultSemester(),
      description: classData.description || '',
    });
    setEditError('');
    setShowEditClass(true);
  };

  const handleUpdateClass = async () => {
    if (!classId) return;
    if (editForm.name.trim().length < 3) {
      setEditError(t('instructorClass.errors.nameTooShort'));
      return;
    }
    if (!editForm.subject.trim()) {
      setEditError(t('instructorClass.errors.subjectRequired'));
      return;
    }
    setIsUpdatingClass(true);
    setEditError('');
    try {
      await updateClassApi(classId, {
        name: editForm.name.trim(),
        subject: editForm.subject.trim(),
        semester: editForm.semester.trim(),
        description: editForm.description.trim(),
      });
      await refetchClass();
      setShowEditClass(false);
    } catch (e: any) {
      setEditError(e.message || t('instructorClass.errors.updateClassFailed'));
    } finally {
      setIsUpdatingClass(false);
    }
  };

  const handleAddStudent = async () => {
    if (!classId) return;
    const email = studentEmail.trim();
    if (!email) {
      setAddStudentError(t('instructorClassDetail.errors.emailRequired'));
      return;
    }
    if (!/^\d{8}$/.test(email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAddStudentError(t('instructorClassDetail.errors.invalidEmail'));
      return;
    }
    setIsAddingStudent(true);
    setAddStudentError('');
    try {
      await addStudentApi(classId, email);
      await refetchClass();
      setShowAddStudent(false);
      setStudentEmail('');
    } catch (e: any) {
      setAddStudentError(e.message || t('instructorClassDetail.errors.addStudentFailed'));
    } finally {
      setIsAddingStudent(false);
    }
  };

  const isLoading = isClassLoading || isHwLoading;

  if (isLoading && !classData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-(--ws-accent) border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="text-center py-20 bg-(--ws-panel) border border-(--ws-border) rounded-2xl shadow-sm">
        <GraduationCap size={48} className="text-(--ws-faint) mx-auto mb-4" />
        <h3 className="text-lg font-bold text-(--ws-text)">{t('instructorClassDetail.notFoundTitle')}</h3>
        <p className="text-sm text-(--ws-muted) mt-1 mb-5">{t('instructorClassDetail.notFoundSubtitle')}</p>
        <button
          onClick={() => navigate('/instructor/classes')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-(--ws-accent) text-(--ws-on-accent) text-sm font-medium rounded-xl hover:bg-(--ws-accent-strong) shadow-sm"
        >
          <ArrowLeft size={16} /> {t('instructorClassDetail.backToClassList')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-(--ws-text) max-w-7xl mx-auto">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-(--ws-muted)">
          <button
            onClick={() => navigate('/instructor/classes')}
            className="hover:text-(--ws-accent) transition-colors flex items-center gap-1 font-medium"
          >
            <ArrowLeft size={16} /> {t('instructorClassDetail.backLabel')}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-(--ws-panel2) border border-(--ws-border) rounded-xl text-xs font-mono text-(--ws-text)">
            <Link2 size={13} className="text-(--ws-accent)" />
            <span>{displayInviteUrl}</span>
          </div>
          <button
            onClick={() => copy(fullInviteUrl, 'link')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-(--ws-accent) text-(--ws-on-accent) text-xs font-semibold rounded-xl hover:bg-(--ws-accent-strong) transition-colors shadow-sm"
            title={t('instructorClassDetail.copyFullInviteLinkTooltip')}
          >
            {copied === 'link' ? <Check size={14} className="text-(--ws-ok)" /> : <Copy size={14} />}
            <span>{copied === 'link' ? t('instructorClass.copiedLabel') : t('instructorClass.copyLinkLabel')}</span>
          </button>
          <button
            onClick={() => copy(classData.invite_code || '', 'code')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-(--ws-panel2) border border-(--ws-border) text-xs font-semibold text-(--ws-accent) rounded-xl hover:bg-(--ws-hover) transition-colors"
            title={t('instructorClass.copyClassCode')}
          >
            {copied === 'code' ? <Check size={14} className="text-(--ws-ok)" /> : <Hash size={14} />}
            <span className="font-mono">{displayCode}</span>
          </button>
          <button
            onClick={openEditModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-(--ws-panel2) border border-(--ws-border) text-xs font-semibold text-(--ws-accent) rounded-xl hover:bg-(--ws-hover) transition-colors"
            title={t('instructorClassDetail.editClassInfoTooltip')}
          >
            <Edit3 size={13} />
            <span>{t('instructorClassDetail.editClassBtn')}</span>
          </button>
        </div>
      </div>

      {/* Class Banner / Header Card */}
      <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-linear-to-br from-(--ws-accent-strong) to-(--ws-accent) rounded-2xl flex items-center justify-center text-(--ws-on-accent) shadow-md shrink-0">
              <GraduationCap size={28} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold font-serif text-(--ws-text)">{classData.subject ? `${classData.subject} - ${classData.name}` : classData.name}</h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-(--ws-panel2) text-(--ws-accent) border border-(--ws-border)">
                  {formatSemesterWithYear(classData.semester || t('instructorClassDetail.defaultSemesterLabel'))}
                </span>
              </div>
              <p className="text-sm text-(--ws-text) max-w-2xl leading-relaxed">
                {classData.description || t('instructorClassDetail.noDescriptionLong')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-(--ws-border) pt-4 md:pt-0 md:pl-6">
            <div className="text-center md:text-left">
              <p className="text-xs text-(--ws-muted) font-medium">{t('instructorClassDetail.studentsStatLabel')}</p>
              <p className="text-2xl font-bold text-(--ws-accent)">{rawMembers.length}</p>
            </div>
            <div className="text-center md:text-left">
              <p className="text-xs text-(--ws-muted) font-medium">{t('instructorClassDetail.homeworkStatLabel')}</p>
              <p className="text-2xl font-bold text-(--ws-accent)">{apiHomeworks.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-3 border-b border-(--ws-border)">
        <button
          onClick={() => setActiveTab('homework')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'homework'
              ? 'border-(--ws-accent) text-(--ws-accent)'
              : 'border-transparent text-(--ws-muted) hover:text-(--ws-text)'
          }`}
        >
          <ClipboardList size={17} />
          {t('instructorClassDetail.homeworkStatLabel')}
          <span className="px-2 py-0.5 text-xs rounded-full bg-(--ws-panel2) text-(--ws-accent) font-mono">
            {apiHomeworks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'members'
              ? 'border-(--ws-accent) text-(--ws-accent)'
              : 'border-transparent text-(--ws-muted) hover:text-(--ws-text)'
          }`}
        >
          <Users size={17} />
          {t('instructorClassDetail.membersTab')}
          <span className="px-2 py-0.5 text-xs rounded-full bg-(--ws-panel2) text-(--ws-accent) font-mono">
            {rawMembers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('gradebook')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'gradebook'
              ? 'border-(--ws-accent) text-(--ws-accent)'
              : 'border-transparent text-(--ws-muted) hover:text-(--ws-text)'
          }`}
        >
          <GraduationCap size={17} />
          Sổ điểm (Gradebook)
          {gradebookData && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-(--ws-panel2) text-(--ws-accent) font-mono">
              {gradebookData.students.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'skills'
              ? 'border-(--ws-accent) text-(--ws-accent)'
              : 'border-transparent text-(--ws-muted) hover:text-(--ws-text)'
          }`}
        >
          <Brain size={17} aria-hidden="true" />
          {t('skills.class.tab')}
        </button>
      </div>

      {activeTab === 'skills' && classId && <ClassSkillHeatmap classId={classId} />}

      {/* ================= TAB 1: BÀI TẬP ================= */}
      {activeTab === 'homework' && (
        <div className="space-y-4 animate-fade-in">
          {/* Section Header (Tier 1: Synchronized with Members tab) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-(--ws-accent)/10 text-(--ws-accent) flex items-center justify-center shadow-2xs shrink-0">
                <ClipboardList size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold font-serif text-(--ws-text)">{t('instructorClassDetail.hwSectionTitle')}</h2>
                <p className="text-xs text-(--ws-muted)">{t('instructorClassDetail.hwSectionSubtitle')}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setHwForm({ title: '', description: '', deadline: '' });
                setHwProblems([]);
                setHwError('');
                setEditingHwId(null);
                setShowCreateHw(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-(--ws-accent) text-(--ws-on-accent) text-xs font-semibold rounded-xl hover:bg-(--ws-accent-strong) transition-colors shadow-sm shrink-0"
            >
              <Plus size={15} /> {t('instructorClassDetail.createHwBtn')}
            </button>
          </div>

          {/* Search & Filter Toolbar (Tier 2: Synchronized with Members tab) */}
          <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--ws-muted)" />
              <input
                value={hwSearchQuery}
                onChange={(e) => setHwSearchQuery(e.target.value)}
                placeholder={t('instructorClassDetail.hwSearchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 bg-(--ws-panel2) border border-(--ws-border) rounded-xl text-sm text-(--ws-text) placeholder:text-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
              />
              {hwSearchQuery && (
                <button aria-label={t('common.close')}
                  onClick={() => setHwSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-(--ws-muted) hover:text-(--ws-text)"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-(--ws-panel2) border border-(--ws-border) rounded-xl text-xs font-semibold shrink-0">
              <button
                onClick={() => setHwStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  hwStatusFilter === 'all' ? 'bg-(--ws-accent) text-(--ws-on-accent) shadow-xs' : 'text-(--ws-muted) hover:text-(--ws-text)'
                }`}
              >
                {t('instructorClassDetail.filterAll', { count: apiHomeworks.length })}
              </button>
              <button
                onClick={() => setHwStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  hwStatusFilter === 'active' ? 'bg-(--ws-accent) text-(--ws-on-accent) shadow-xs' : 'text-(--ws-muted) hover:text-(--ws-text)'
                }`}
              >
                {t('instructorClassDetail.filterActive', { count: activeHwCount })}
              </button>
              <button
                onClick={() => setHwStatusFilter('overdue')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  hwStatusFilter === 'overdue' ? 'bg-(--ws-accent) text-(--ws-on-accent) shadow-xs' : 'text-(--ws-muted) hover:text-(--ws-text)'
                }`}
              >
                {t('instructorClassDetail.filterOverdue', { count: overdueHwCount })}
              </button>
            </div>
          </div>

          {/* List Header Summary Bar */}
          <div className="px-5 py-3 border border-(--ws-border) rounded-xl bg-(--ws-panel2) flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-(--ws-text)">
              {t('instructorClassDetail.hwListHeader', { count: filteredHomeworks.length })}
            </span>
            <span className="text-(--ws-muted)">
              {t('instructorClassDetail.hwShowingCount', { shown: filteredHomeworks.length, total: apiHomeworks.length })}
            </span>
          </div>

          {apiHomeworks.length === 0 ? (
            <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-12 text-center shadow-sm">
              <ClipboardList size={42} className="text-(--ws-faint) mx-auto mb-3" />
              <h3 className="text-base font-bold text-(--ws-text)">{t('instructorClassDetail.hwEmptyTitle')}</h3>
              <p className="text-sm text-(--ws-muted) mt-1 mb-5 max-w-md mx-auto">
                {t('instructorClassDetail.hwEmptySubtitle')}
              </p>
            </div>
          ) : filteredHomeworks.length === 0 ? (
            <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-10 text-center shadow-sm">
              <Search size={36} className="text-(--ws-faint) mx-auto mb-3" />
              <h3 className="text-base font-bold text-(--ws-text)">{t('instructorClassDetail.hwNoMatchTitle')}</h3>
              <p className="text-xs text-(--ws-muted) mt-1">
                {t('instructorClassDetail.hwNoMatchSubtitle')}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredHomeworks.map((hw: any) => {
                const p = deadlineProgress(hw.deadline);
                const problemsCount = Array.isArray(hw.tasks) ? hw.tasks.length : hw.problemCount ?? 0;
                const submittedCount = hw.submitted_students ?? hw.submittedStudents ?? 0;

                return (
                  <div
                    key={hw.id}
                    className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-5 hover:border-(--ws-accent)/30 hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="text-base font-bold text-(--ws-text) truncate">{hw.title}</h3>
                        <span
                          className={`text-xs font-semibold flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${
                            p.overdue
                              ? 'bg-(--ws-danger-soft) text-(--ws-danger) border-(--ws-danger)/35'
                              : p.daysLeft <= 3
                              ? 'bg-(--ws-warn-soft) text-(--ws-warn) border-(--ws-warn)/35'
                              : 'bg-(--ws-ok-soft) text-(--ws-ok) border-(--ws-ok)/35'
                          }`}
                        >
                          <Clock size={11} /> {p.label}
                        </span>
                      </div>

                      <p className="text-xs text-(--ws-muted) line-clamp-1 mb-3">
                        {hw.description || t('instructorClassDetail.hwNoDescription')}
                      </p>

                      <div className="flex flex-wrap items-center gap-5 text-xs text-(--ws-text)">
                        <span className="flex items-center gap-1">
                          <BookOpen size={13} className="text-(--ws-accent)" /> {t('instructorClass.problemsCountSuffix', { count: problemsCount })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className="text-(--ws-accent)" /> {t('instructorClassDetail.deadlineLabel', { date: formatVNFull(hw.deadline) })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={13} className="text-(--ws-accent)" /> {t('instructorClassDetail.progressLabel', { submitted: submittedCount, total: rawMembers.length })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {p.overdue && (
                        <button
                          onClick={() => setResultsHwId(hw.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-(--ws-accent) text-(--ws-on-accent) text-xs font-semibold rounded-xl hover:bg-(--ws-accent-strong) transition-colors shadow-sm"
                        >
                          <Award size={14} /> Xem kết quả
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingHwId(hw.id);
                          setHwForm({
                            title: hw.title ?? '',
                            description: hw.description ?? '',
                            deadline: toDatetimeLocal(hw.deadline),
                          });
                          setHwProblems(Array.isArray(hw.tasks) ? hw.tasks : []);
                          setHwError('');
                          setShowCreateHw(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-(--ws-panel2) text-(--ws-text) text-xs font-semibold rounded-xl hover:bg-(--ws-hover) transition-colors"
                      >
                        <Edit3 size={14} /> {t('instructorClassDetail.editHwBtn')}
                      </button>

                      {confirmDeleteHwId === hw.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDeleteHomework(hw.id)}
                            className="px-2.5 py-1.5 bg-(--ws-danger) text-(--ws-on-accent) text-xs font-semibold rounded-lg hover:bg-(--ws-danger)"
                          >
                            {t('common.delete')}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteHwId(null)}
                            className="px-2.5 py-1.5 bg-(--ws-panel2) text-(--ws-text) text-xs font-semibold rounded-lg hover:bg-(--ws-hover)"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteHwId(hw.id)}
                          className="p-2 text-(--ws-muted) hover:text-(--ws-danger) hover:bg-(--ws-danger-soft) rounded-lg transition-colors"
                          title={t('instructorClassDetail.deleteHwTooltip')}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: THÀNH VIÊN ================= */}
      {activeTab === 'members' && (
        <div className="space-y-4 animate-fade-in">
          {/* Section Header (Tier 1: Synchronized with Homework tab) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-(--ws-accent)/10 text-(--ws-accent) flex items-center justify-center shadow-2xs shrink-0">
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold font-serif text-(--ws-text)">{t('instructorClassDetail.membersSectionTitle')}</h2>
                <p className="text-xs text-(--ws-muted)">{t('instructorClassDetail.membersSectionSubtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => { setStudentEmail(''); setAddStudentError(''); setShowAddStudent(true); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-(--ws-accent) text-(--ws-on-accent) text-xs font-semibold rounded-xl hover:bg-(--ws-accent-strong) transition-colors shadow-sm"
                title={t('instructorClassDetail.addStudentTooltip')}
              >
                <UserPlus size={14} />
                <span>{t('instructorClassDetail.addStudentBtn')}</span>
              </button>
              <button
                onClick={() => { resetRosterModal(); setShowRosterModal(true); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-(--ws-panel2) text-(--ws-text) border border-(--ws-border) text-xs font-semibold rounded-xl hover:bg-(--ws-hover) transition-colors shadow-xs"
                title={t('instructorClassDetail.rosterUploadTooltip')}
              >
                <Upload size={14} />
                <span>{t('instructorClassDetail.rosterUploadBtn')}</span>
              </button>
              <button
                onClick={() => copy(classData.invite_code || '', 'code')}
                className="inline-flex items-center gap-1 px-2.5 py-2 bg-(--ws-panel2) border border-(--ws-border) text-xs font-semibold text-(--ws-accent) rounded-xl hover:bg-(--ws-hover) transition-colors"
                title={t('instructorClass.copyClassCode')}
              >
                {copied === 'code' ? <Check size={14} className="text-(--ws-ok)" /> : <Hash size={14} />}
                {t('instructorClassDetail.codeWithPrefix', { code: displayCode })}
              </button>
              <button
                onClick={() => copy(fullInviteUrl, 'link')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-(--ws-panel2) text-(--ws-text) border border-(--ws-border) text-xs font-semibold rounded-xl hover:bg-(--ws-hover) transition-colors shadow-xs"
                title={t('instructorClassDetail.copyInviteLinkTooltip')}
              >
                {copied === 'link' ? <Check size={14} className="text-(--ws-ok)" /> : <Link2 size={14} />}
                {t('instructorClass.copyLinkLabel')}
              </button>
            </div>
          </div>

          {rosterInfo && rosterInfo.count > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-(--ws-panel2) border border-(--ws-border) rounded-xl px-4 py-2.5 text-xs text-(--ws-text)">
              <span>
                {t('instructorClassDetail.rosterInfo', { count: rosterInfo.count, joined: rosterInfo.joined_count })}
              </span>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowRosterListModal(true)} className="font-semibold text-(--ws-accent) hover:underline">
                  {t('instructorClassDetail.rosterView')}
                </button>
                <button onClick={handleClearRoster} className="font-semibold text-(--ws-danger) hover:underline">
                  {t('instructorClassDetail.rosterClear')}
                </button>
              </div>
            </div>
          )}

          {/* Search & Sort Toolbar (Tier 2: Synchronized with Homework tab) */}
          <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--ws-muted)" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('instructorClassDetail.membersSearchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 bg-(--ws-panel2) border border-(--ws-border) rounded-xl text-sm text-(--ws-text) placeholder:text-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
              />
              {searchQuery && (
                <button aria-label={t('common.close')}
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-(--ws-muted) hover:text-(--ws-text)"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2 shrink-0">
              <ArrowUpDown size={15} className="text-(--ws-muted)" />
              <span className="text-xs font-semibold text-(--ws-muted) uppercase tracking-wider">{t('instructorClassDetail.sortLabel')}</span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as any)}
                className="px-3 py-2 bg-(--ws-panel2) border border-(--ws-border) rounded-xl text-xs font-semibold text-(--ws-text) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
              >
                <option value="stt">{t('instructorClassDetail.sortJoinOrder')}</option>
                <option value="name_asc">{t('instructorClassDetail.sortNameAsc')}</option>
                <option value="name_desc">{t('instructorClassDetail.sortNameDesc')}</option>
                <option value="rating_desc">{t('instructorClassDetail.sortRatingDesc')}</option>
                <option value="subs_desc">{t('instructorClassDetail.sortSubsDesc')}</option>
              </select>
            </div>
          </div>

          {/* Members Table Card */}
          <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-(--ws-border) bg-(--ws-panel2) flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-(--ws-text)">
                {t('instructorClassDetail.membersListHeader', { count: filteredMembers.length })}
              </span>
              <span className="text-xs text-(--ws-muted)">
                {t('instructorClassDetail.membersShowingCount', { shown: filteredMembers.length, total: rawMembers.length })}
              </span>
            </div>

            {filteredMembers.length === 0 ? (
              <div className="p-12 text-center">
                <Users size={36} className="text-(--ws-faint) mx-auto mb-3" />
                <p className="font-semibold text-(--ws-text)">
                  {searchQuery ? t('instructorClassDetail.noStudentsFound') : t('instructorClassDetail.noStudentsYet')}
                </p>
                <p className="text-xs text-(--ws-muted) mt-1">
                  {searchQuery
                    ? t('instructorClassDetail.noStudentsFoundHint')
                    : t('instructorClassDetail.noStudentsYetHint')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-(--ws-border) bg-(--ws-panel) text-[11px] font-bold text-(--ws-muted) uppercase tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">{t('instructorClassDetail.colStt')}</th>
                      <th className="py-3 px-4">{t('instructorClassDetail.colMssv')}</th>
                      <th className="py-3 px-4">{t('instructorClassDetail.colFullName')}</th>
                      <th className="py-3 px-4">{t('instructorClassDetail.colEmail')}</th>
                      <th className="py-3 px-4 text-center">{t('instructorClassDetail.colSubmissions')}</th>
                      <th className="py-3 px-4 text-center">{t('instructorClassDetail.colRating')}</th>
                      <th className="py-3 px-4">{t('instructorClassDetail.colJoinedDate')}</th>
                      <th className="py-3 px-4 text-right">{t('instructorClassDetail.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--ws-border) text-sm">
                    {filteredMembers.map((m, idx) => (
                      <tr key={m.id} className="hover:bg-(--ws-hover)/60 transition-colors">
                        <td className="py-3.5 px-4 text-center text-xs font-semibold text-(--ws-muted)">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-(--ws-text)">
                          {m.studentCode || '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-linear-to-br from-(--ws-accent-strong) to-(--ws-accent) text-(--ws-on-accent) flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                              {m.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-xs text-(--ws-text)">{m.displayName}</p>
                              <p className="text-[11px] text-(--ws-muted)">@{m.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-(--ws-text)">
                          {m.email}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-(--ws-panel2) text-(--ws-accent)">
                            {t('instructorClassDetail.submissionsCountSuffix', { count: m.submissionsCount })}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="text-xs font-bold text-(--ws-accent)">
                            {m.rating}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-(--ws-muted)">
                          {m.joinedAt ? formatVN(m.joinedAt, { time: false }) : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setConfirmKickStudent({ id: m.id, name: m.displayName })}
                            className="p-1.5 text-(--ws-muted) hover:text-(--ws-danger) hover:bg-(--ws-danger-soft) rounded-lg transition-colors"
                            title={t('instructorClassDetail.removeStudentTooltip')}
                          >
                            <UserX size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: SỔ ĐIỂM (GRADEBOOK) ================= */}
      {activeTab === 'gradebook' && (
        <div className="space-y-4 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-(--ws-warn)/10 text-(--ws-warn) flex items-center justify-center shadow-2xs shrink-0">
                <GraduationCap size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold font-serif text-(--ws-text)">Sổ điểm tổng hợp lớp học</h2>
                <p className="text-xs text-(--ws-muted)">Theo dõi ma trận tiến độ nộp bài, điểm số tự động và điểm giảng viên chấm cho từng bài tập.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => refetchGradebook()}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-(--ws-panel) border border-(--ws-border) text-xs font-semibold rounded-xl text-(--ws-text) hover:text-(--ws-text) hover:bg-(--ws-hover) transition-all shadow-2xs"
                title="Tải lại dữ liệu sổ điểm"
              >
                <RotateCcw size={13} className={isGradebookLoading ? 'animate-spin' : ''} />
                Làm mới
              </button>
              {gradebookData && gradebookData.students.length > 0 && (
                <button
                  onClick={() => exportGradebookCsv(gradebookData)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-(--ws-accent) text-(--ws-on-accent) text-xs font-semibold rounded-xl hover:bg-(--ws-accent-strong) transition-colors shadow-sm"
                  title="Xuất bảng điểm ra file .csv"
                >
                  <Download size={14} />
                  Xuất file .csv
                </button>
              )}
            </div>
          </div>

          {/* Gradebook Matrix Table */}
          {isGradebookLoading ? (
            <div className="p-16 text-center text-sm text-(--ws-muted)">Đang tổng hợp dữ liệu sổ điểm...</div>
          ) : !gradebookData || gradebookData.students.length === 0 ? (
            <div className="p-12 text-center bg-(--ws-panel) border border-(--ws-border) rounded-2xl">
              <GraduationCap size={40} className="text-(--ws-faint) mx-auto mb-3" />
              <p className="text-sm font-semibold text-(--ws-text)">Chưa có dữ liệu sổ điểm</p>
              <p className="text-xs text-(--ws-muted) mt-1">Lớp học chưa có sinh viên hoặc chưa được giao bài tập nào.</p>
            </div>
          ) : (
            <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-(--ws-panel2)/60 border-b border-(--ws-border)">
                      <th className="py-3 px-3 font-bold text-(--ws-text) uppercase tracking-wider text-center w-14 min-w-14">
                        STT
                      </th>
                      <th className="py-3 px-4 font-bold text-(--ws-text) uppercase tracking-wider min-w-[110px]">
                        MSSV
                      </th>
                      <th className="py-3 px-4 font-bold text-(--ws-text) uppercase tracking-wider min-w-[200px]">
                        Họ và tên
                      </th>
                      {gradebookData.homework_columns.map((hw) => (
                        <th
                          key={hw.homework_id}
                          className="py-3 px-3 font-semibold text-(--ws-text) text-center border-l border-(--ws-border)/60 min-w-[130px]"
                          title={hw.homework_title}
                        >
                          <span className="block mx-auto text-center font-bold text-(--ws-text) truncate max-w-[140px]">{hw.homework_title}</span>
                        </th>
                      ))}
                      <th className="py-3 px-3 font-bold text-(--ws-text) uppercase tracking-wider text-center border-l border-(--ws-border)/60 min-w-[110px]">
                        Tổng điểm
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--ws-border)/60">
                    {sortGradebookStudents(gradebookData.students).map((st, index) => {
                      const scores = homeworkScores(gradebookData, st);
                      return (
                      <tr key={st.id} className="hover:bg-(--ws-hover)/60 transition-colors">
                        <td className="py-3 px-3 text-center text-(--ws-muted)">{index + 1}</td>
                        <td className="py-3 px-4 font-mono text-(--ws-text)">{st.student_code || '—'}</td>
                        <td className="py-3 px-4 border-r border-(--ws-border)/40">
                          <p className="font-bold text-(--ws-text)">{gradebookStudentName(st)}</p>
                        </td>
                        {scores.perHomework.map((h) => (
                          <td key={h.id} className="py-3 px-3 text-center border-l border-(--ws-border)/40 font-semibold text-(--ws-text)">
                            {fmtScore(h.earned)}/{fmtScore(h.total)}
                          </td>
                        ))}
                        <td className="py-3 px-3 text-center border-l border-(--ws-border)/40 font-bold text-(--ws-accent)">
                          {fmtScore(scores.earned)}/{fmtScore(scores.total)}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: GIAO BÀI TẬP MỚI ================= */}
      {showCreateHw && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-90 flex items-center justify-center p-4" onClick={() => setShowCreateHw(false)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--ws-border) sticky top-0 z-10 bg-(--ws-panel)">
              <div>
                <h3 className="font-bold font-serif text-[16px]">{editingHwId ? t('instructorClassDetail.editHwTitle') : t('instructorClassDetail.createHwBtn')}</h3>
                <p className="text-xs text-(--ws-muted) mt-0.5">{classData.subject ? `${classData.subject} - ${classData.name}` : classData.name}</p>
              </div>
              <button aria-label={t('common.close')} onClick={() => setShowCreateHw(false)} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={18} aria-hidden="true" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorClassDetail.fieldHwTitle')}</label>
                <input
                  value={hwForm.title}
                  onChange={(e) => setHwForm({ ...hwForm, title: e.target.value })}
                  placeholder={t('instructorClassDetail.fieldHwTitlePlaceholder')}
                  className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorClassDetail.fieldHwDeadline')}</label>
                <input
                  type="datetime-local"
                  value={hwForm.deadline}
                  onChange={(e) => setHwForm({ ...hwForm, deadline: e.target.value })}
                  className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorClassDetail.fieldHwDescriptionLabel')}</label>
                <textarea
                  value={hwForm.description}
                  onChange={(e) => setHwForm({ ...hwForm, description: e.target.value })}
                  rows={2}
                  placeholder={t('instructorClassDetail.fieldHwDescriptionPlaceholder')}
                  className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent) resize-none"
                />
              </div>

              {/* Problem Manager */}
              <ProblemManager problems={hwProblems} onChange={setHwProblems} />

              {hwError && <p className="text-xs text-(--ws-danger) font-medium">{hwError}</p>}
              <p className="text-[11.5px] text-(--ws-muted) bg-(--ws-panel2) border border-(--ws-border) rounded-lg px-3 py-2">
                <Lock size={12} className="inline-block align-[-2px] mr-1" aria-hidden="true" />{t('instructorHomework.visibilityHint')}
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-(--ws-border)">
                <button
                  type="button"
                  onClick={() => setShowCreateHw(false)}
                  disabled={isSavingHw}
                  className="px-5 py-2.5 bg-(--ws-panel2) border border-(--ws-border) text-(--ws-muted) text-xs font-semibold rounded-xl hover:bg-(--ws-hover) transition-colors disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveHomework}
                  disabled={isSavingHw}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-(--ws-accent) text-(--ws-on-accent) text-xs font-semibold rounded-xl hover:bg-(--ws-accent-strong) shadow-sm disabled:opacity-50 transition-colors"
                >
                  {isSavingHw && <span className="w-3.5 h-3.5 border-2 border-(--ws-panel)/30 border-t-white rounded-full animate-spin" />}
                  {editingHwId ? t('instructorClassDetail.saveHwChanges') : t('instructorClassDetail.saveAndAssignHw')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ================= MODAL: CONFIRM KICK SINH VIÊN ================= */}
      {confirmKickStudent && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-90 flex items-center justify-center p-4" onClick={() => setConfirmKickStudent(null)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-(--ws-danger-soft) text-(--ws-danger) flex items-center justify-center mx-auto">
              <UserX size={24} />
            </div>
            <div>
              <h3 className="font-bold text-base text-(--ws-text)">{t('instructorClassDetail.kickConfirmTitle')}</h3>
              <p className="text-xs text-(--ws-muted) mt-1">
                {t('instructorClassDetail.kickConfirmBody', { name: confirmKickStudent.name })}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmKickStudent(null)}
                disabled={isKicking}
                className="flex-1 py-2 bg-(--ws-panel2) border border-(--ws-faint) text-(--ws-text) text-xs font-semibold rounded-xl hover:bg-(--ws-hover) transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleKickStudent}
                disabled={isKicking}
                className="flex-1 py-2 bg-(--ws-danger) text-(--ws-on-accent) text-xs font-semibold rounded-xl hover:bg-(--ws-danger) disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isKicking && <span className="w-3.5 h-3.5 border-2 border-(--ws-panel)/30 border-t-white rounded-full animate-spin" />}
                {t('instructorClassDetail.kickConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ================= MODAL: CHỈNH SỬA LỚP HỌC ================= */}
      {showEditClass && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-85 flex items-center justify-center p-4" onClick={() => setShowEditClass(false)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--ws-border)">
              <div>
                <h3 className="font-bold font-serif text-[16px]">{t('instructorClass.editModalTitle')}</h3>
                <p className="text-xs text-(--ws-muted) mt-0.5">{classData.subject ? `${classData.subject} - ${classData.name}` : classData.name}</p>
              </div>
              <button aria-label={t('common.close')} onClick={() => setShowEditClass(false)} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={18} aria-hidden="true" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorClass.fieldClassName')}</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder={t('instructorClass.fieldClassNamePlaceholder')}
                  className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorClass.fieldSubject')}</label>
                <input
                  value={editForm.subject}
                  onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                  placeholder={t('instructorClass.fieldSubjectPlaceholder')}
                  className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorClass.fieldSemester')}</label>
                <input
                  value={editForm.semester}
                  onChange={(e) => setEditForm({ ...editForm, semester: e.target.value })}
                  placeholder={t('instructorClass.fieldSemesterPlaceholder')}
                  list="semester-suggestions-classdetail-edit"
                  className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
                />
                <datalist id="semester-suggestions-classdetail-edit">
                  {semesterSuggestions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorClass.fieldDescription')}</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  placeholder={t('instructorClass.fieldDescriptionPlaceholder')}
                  className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent) resize-none"
                />
              </div>
              {editError && <p className="text-xs text-(--ws-danger) font-medium">{editError}</p>}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-(--ws-border)">
                <button
                  type="button"
                  onClick={() => setShowEditClass(false)}
                  disabled={isUpdatingClass}
                  className="px-5 py-2.5 bg-(--ws-panel2) border border-(--ws-border) text-(--ws-muted) text-xs font-semibold rounded-xl hover:bg-(--ws-hover) transition-colors disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleUpdateClass}
                  disabled={isUpdatingClass}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-(--ws-accent) text-(--ws-on-accent) text-xs font-semibold rounded-xl hover:bg-(--ws-accent-strong) shadow-sm disabled:opacity-50 transition-colors"
                >
                  {isUpdatingClass && <span className="w-3.5 h-3.5 border-2 border-(--ws-panel)/30 border-t-white rounded-full animate-spin" />}
                  {t('instructorClass.saveChanges')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ================= MODAL: XEM DANH SÁCH MSSV ================= */}
      {showRosterListModal && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-90 flex items-center justify-center p-4" onClick={() => setShowRosterListModal(false)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-2xl w-full max-w-lg max-h-[90vh] shadow-2xl animate-slide-up flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--ws-border)">
              <div>
                <h3 className="font-bold font-serif text-[16px]">{t('instructorClassDetail.rosterListTitle')}</h3>
                <p className="text-xs text-(--ws-muted) mt-0.5">
                  {t('instructorClassDetail.rosterInfo', { count: rosterInfo?.count ?? 0, joined: rosterInfo?.joined_count ?? 0 })}
                </p>
              </div>
              <button aria-label={t('common.close')} onClick={() => setShowRosterListModal(false)} className="text-(--ws-muted) hover:text-(--ws-text)">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="p-4 min-h-0 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-(--ws-muted) border-b border-(--ws-border)">
                    <th className="px-3 py-2 font-semibold">MSSV</th>
                    <th className="px-3 py-2 font-semibold">{t('instructorClassDetail.rosterStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...(rosterInfo?.students ?? [])]
                    .sort((a, b) => a.student_code.localeCompare(b.student_code))
                    .map((student) => (
                      <tr key={student.student_code} className="border-b border-(--ws-border) last:border-0">
                        <td className="px-3 py-2.5 font-mono">{student.student_code}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            student.joined
                              ? 'bg-(--ws-ok-soft) text-(--ws-ok) border-(--ws-ok)/35'
                              : 'bg-(--ws-warn-soft) text-(--ws-warn) border-(--ws-warn)/35'
                          }`}>
                            {student.joined
                              ? t('instructorClassDetail.rosterJoined')
                              : t('instructorClassDetail.rosterNotJoined')}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-(--ws-border) flex justify-end">
              <button onClick={() => setShowRosterListModal(false)} className="px-4 py-2 text-sm text-(--ws-muted) hover:text-(--ws-text)">
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ================= MODAL: TẢI LÊN DANH SÁCH LỚP ================= */}
      {showRosterModal && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-90 flex items-center justify-center p-4" onClick={closeRosterModal}>
          <div className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--ws-border)">
              <div>
                <h3 className="font-bold font-serif text-[16px]">{t('instructorClassDetail.rosterModalTitle')}</h3>
                <p className="text-xs text-(--ws-muted) mt-0.5">{classData.subject ? `${classData.subject} - ${classData.name}` : classData.name}</p>
              </div>
              <button aria-label={t('common.close')} onClick={closeRosterModal} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={18} aria-hidden="true" /></button>
            </div>
            <div className="p-6 space-y-4">
              <label
                onDragOver={(e) => { e.preventDefault(); setIsDraggingRoster(true); }}
                onDragLeave={() => setIsDraggingRoster(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingRoster(false);
                  void pickRosterFiles(e.dataTransfer.files);
                }}
                className={`flex flex-col items-center justify-center gap-2 text-center px-4 py-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  isDraggingRoster ? 'border-(--ws-accent) bg-(--ws-accent)/5' : 'border-(--ws-border) hover:border-(--ws-accent)/60'
                }`}
              >
                <Upload size={28} className="text-(--ws-accent)" />
                <p className="text-sm font-semibold">{t('instructorClassDetail.rosterDropHere')}</p>
                <p className="text-xs text-(--ws-muted)">{t('instructorClassDetail.rosterOrBrowse')}</p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    void pickRosterFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>

              {rosterFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold">{t('instructorClassDetail.rosterFilesHeading', { count: rosterFiles.length })}</p>
                  <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                    {rosterFiles.map((f) => (
                      <li
                        key={f.key}
                        className={`flex items-start justify-between gap-3 px-3 py-2 rounded-lg border text-xs ${
                          f.error ? 'border-(--ws-danger)/35 bg-(--ws-danger-soft)' : 'border-(--ws-ok)/35 bg-(--ws-ok-soft)'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-(--ws-text) break-all">{f.name}</p>
                          {f.error ? (
                            <p className="text-(--ws-danger) mt-0.5">{f.error}</p>
                          ) : (
                            <p className="text-(--ws-ok) mt-0.5">
                              {t('instructorClassDetail.rosterPreview', { count: f.codes?.length ?? 0, invalid: f.invalidCount ?? 0 })}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setRosterFiles((prev) => prev.filter((p) => p.key !== f.key))}
                          className="text-(--ws-muted) hover:text-(--ws-danger) shrink-0"
                          title={t('instructorClassDetail.rosterRemoveFile')}
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                  {rosterAllCodes.length > 0 && (
                    <p className="text-xs font-semibold text-(--ws-ok)">
                      {t('instructorClassDetail.rosterTotal', { count: rosterAllCodes.length, files: rosterValidFiles.length })}
                    </p>
                  )}
                </div>
              )}
              {rosterError && <p className="text-xs font-medium text-(--ws-danger)">{rosterError}</p>}

              <div className="rounded-xl border border-(--ws-border) bg-(--ws-editor) p-4 space-y-2">
                <p className="text-xs font-bold">{t('instructorClassDetail.rosterGuideTitle')}</p>
                <ul className="text-xs text-(--ws-muted) space-y-1 list-disc pl-4">
                  <li>{t('instructorClassDetail.rosterGuide1')}</li>
                  <li>{t('instructorClassDetail.rosterGuide2')}</li>
                  <li>{t('instructorClassDetail.rosterGuide3')}</li>
                  <li>{t('instructorClassDetail.rosterGuide4')}</li>
                </ul>
                <div className="overflow-x-auto">
                  <table className="text-xs font-mono border border-(--ws-border) w-full">
                    <thead>
                      <tr className="bg-(--ws-panel)">
                        <th className="px-2 py-1 text-left border-b border-(--ws-border)">STT</th>
                        <th className="px-2 py-1 text-left border-b border-(--ws-border)">Họ và tên</th>
                        <th className="px-2 py-1 text-left border-b border-(--ws-border) text-(--ws-accent)">MSSV</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="px-2 py-1">1</td><td className="px-2 py-1">Nguyễn Văn A</td><td className="px-2 py-1 font-bold">20120001</td></tr>
                      <tr><td className="px-2 py-1">2</td><td className="px-2 py-1">Trần Thị B</td><td className="px-2 py-1 font-bold">20120002</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-xs text-(--ws-muted)">{t('instructorClassDetail.rosterReplaceNote')}</p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-(--ws-border)">
                <button onClick={closeRosterModal} className="px-4 py-2 text-sm text-(--ws-muted) hover:text-(--ws-text)">
                  {t('common.cancel')}
                </button>
                <button
                  onClick={submitRoster}
                  disabled={rosterAllCodes.length === 0 || isUploadingRoster}
                  className="px-5 py-2 bg-(--ws-accent) text-(--ws-on-accent) text-sm font-semibold rounded-xl hover:bg-(--ws-accent-strong) disabled:opacity-50"
                >
                  {isUploadingRoster ? t('instructorClassDetail.rosterUploading') : t('instructorClassDetail.rosterSubmit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {showAddStudent && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-85 flex items-center justify-center p-4" onClick={() => setShowAddStudent(false)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-2xl w-full max-w-md shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--ws-border)">
              <div>
                <h3 className="font-bold font-serif text-[16px]">{t('instructorClassDetail.addStudentModalTitle')}</h3>
                <p className="text-xs text-(--ws-muted) mt-0.5">{classData.subject ? `${classData.subject} - ${classData.name}` : classData.name}</p>
              </div>
              <button aria-label={t('common.close')} onClick={() => setShowAddStudent(false)} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={18} aria-hidden="true" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorClassDetail.fieldStudentEmail')}</label>
                <input
                  type="text"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                  placeholder={t('instructorClassDetail.fieldStudentEmailPlaceholder')}
                  className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
                  autoFocus
                />
                <p className="text-xs text-(--ws-muted) mt-1.5">
                  {t('instructorClassDetail.addStudentHint')}
                </p>
              </div>
              {addStudentError && <p className="text-xs text-(--ws-danger) font-medium">{addStudentError}</p>}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-(--ws-border)">
                <button
                  type="button"
                  onClick={() => setShowAddStudent(false)}
                  disabled={isAddingStudent}
                  className="px-5 py-2.5 bg-(--ws-panel2) border border-(--ws-border) text-(--ws-muted) text-xs font-semibold rounded-xl hover:bg-(--ws-hover) transition-colors disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleAddStudent}
                  disabled={isAddingStudent}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-(--ws-accent) text-(--ws-on-accent) text-xs font-semibold rounded-xl hover:bg-(--ws-accent-strong) shadow-sm disabled:opacity-50 transition-colors"
                >
                  {isAddingStudent && <span className="w-3.5 h-3.5 border-2 border-(--ws-panel)/30 border-t-white rounded-full animate-spin" />}
                  {t('instructorClassDetail.addStudentBtn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ================= MODAL: KẾT QUẢ BÀI TẬP ĐÃ HẾT HẠN ================= */}
      {resultsHwId && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-90 flex items-center justify-center p-4" onClick={() => setResultsHwId(null)}>
          <div
            className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--ws-border)">
              <div>
                <h3 className="font-bold font-serif text-lg text-(--ws-text)">Kết quả: {resultsHwTitle}</h3>
                <p className="text-xs text-(--ws-muted) mt-0.5">Bấm nút "Xem bài nộp" để xem chi tiết bài nộp của sinh viên.</p>
              </div>
              <button aria-label={t('common.close')} onClick={() => setResultsHwId(null)} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={20} aria-hidden="true" /></button>
            </div>
            <div className="overflow-auto p-6">
              {isGradebookLoading || !gradebookData ? (
                <div className="p-12 text-center text-sm text-(--ws-muted)">Đang tổng hợp kết quả...</div>
              ) : !resultsHwColumn ? (
                <div className="p-12 text-center text-sm text-(--ws-muted)">Không có dữ liệu kết quả cho bài tập này.</div>
              ) : gradebookData.students.length === 0 ? (
                <div className="p-12 text-center text-sm text-(--ws-muted)">Lớp chưa có sinh viên nào.</div>
              ) : (
                <div className="border border-(--ws-border) rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-(--ws-panel2)/60 border-b border-(--ws-border)">
                      <th className="py-3 px-3 font-bold text-(--ws-text) uppercase tracking-wider text-center w-14 min-w-14">STT</th>
                      <th className="py-3 px-4 font-bold text-(--ws-text) uppercase tracking-wider min-w-[180px]">Sinh viên</th>
                      {resultsHwColumn.tasks.map((task) => (
                        <th
                          key={task.task_id}
                          className="py-3 px-3 font-semibold text-(--ws-text) text-center border-l border-(--ws-border)/60 min-w-[170px]"
                        >
                          <span className="block mx-auto text-center font-bold text-(--ws-text) whitespace-normal wrap-break-word">{task.title}</span>
                        </th>
                      ))}
                      <th className="py-3 px-3 font-bold text-(--ws-text) uppercase tracking-wider text-center border-l border-(--ws-border)/60 min-w-[110px]">Tổng điểm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--ws-border)/60">
                    {sortGradebookStudents(gradebookData.students).map((st, index) => {
                      const grades = st.grades.filter((g) => g.homework_id === resultsHwColumn.homework_id);
                      const earned = grades.reduce((sum, g) => sum + gradeEarned(g), 0);
                      const total = grades.reduce((sum, g) => sum + (Number(g.points) || 0), 0);
                      return (
                        <tr key={st.id}>
                          <td className="py-3 px-3 text-center text-(--ws-muted)">{index + 1}</td>
                          <td className="py-3 px-4 font-bold text-(--ws-text)">{gradebookStudentName(st)}</td>
                          {resultsHwColumn.tasks.map((task, ti) => {
                            const g = grades[ti];
                            const canGrade = !!g?.latest_submission_id;
                            return (
                              <td
                                key={task.task_id}
                                className={`py-3 px-3 text-center border-l border-(--ws-border)/40 font-semibold ${
                                  canGrade ? 'text-(--ws-text)' : 'text-(--ws-faint)'
                                }`}
                              >
                                <span className="inline-flex items-center justify-center gap-1.5">
                                  {g && canGrade
                                    ? `${fmtScore(gradeEarned(g))}/${fmtScore(Number(g.points) || 0)}`
                                    : <span className="text-[11px] font-medium italic">Chưa nộp</span>}
                                  {g && canGrade && (
                                    <button
                                      type="button"
                                      onClick={() => openGrading(st, g)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-(--ws-border) bg-(--ws-panel2) text-[10px] font-semibold text-(--ws-text) hover:text-(--ws-accent) hover:bg-(--ws-hover) hover:border-(--ws-accent)/30 transition-colors whitespace-nowrap"
                                      title="Xem bài nộp gần nhất & chấm lại"
                                    >
                                      <Eye size={12} /> Xem bài nộp
                                    </button>
                                  )}
                                </span>
                              </td>
                            );
                          })}
                          <td className="py-3 px-3 text-center border-l border-(--ws-border)/40 font-bold text-(--ws-accent)">
                            {fmtScore(earned)}/{fmtScore(total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ================= XEM LẦN NỘP GẦN NHẤT & CHẤM LẠI (giao diện giống mục Kỳ thi) ================= */}
      {gradingItem?.grade.latest_submission_id && (
        <SubmissionDetailModal
          submissionId={gradingItem.grade.latest_submission_id}
          usernameOverride={gradebookStudentName(gradingItem.student)}
          hideProblemActions
          scoreMax={10}
          gradeMax={10}
          onGraded={() => { refetchGradebook(); }}
          onClose={() => setGradingItem(null)}
        />
      )}
    </div>
  );
}