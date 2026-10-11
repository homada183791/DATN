import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  useClassDetailQuery,
  removeClassStudent,
  updateClass as updateClassApi,
  addStudentToClass as addStudentApi,
  useClassGradebookQuery,
  type ClassGradebookDto,
  type ClassGradebookStudent,
  type ClassGradeItem,
} from '../../api/classes';
import { useClassHomeworksQuery } from '../../api/homeworks';
import { useHomework, deadlineProgress, HomeworkProblem } from '../../context/HomeworkContext';
import { useSubmissionDetailQuery, gradeSubmission } from '../../api/submissions';
import { useToast } from '../../context/ToastContext';
import { formatVN, formatVNFull } from '../../utils/dateTime';
import ProblemManager from '../../components/ProblemManager';
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
  Download,
  RotateCcw,
  Award,
  Code2,
} from 'lucide-react';

function exportGradebookCsv(gradebook: ClassGradebookDto) {
  const headers = ['Email / ID', 'Họ và tên', 'Tên đăng nhập', 'Đã hoàn thành', 'Tỷ lệ AC (%)', 'Điểm tổng kết'];
  const taskCols: string[] = [];
  gradebook.homework_columns.forEach((hw) => {
    hw.tasks.forEach((t) => {
      taskCols.push(`${hw.homework_title} - ${t.title}`);
    });
  });
  const allHeaders = [...headers, ...taskCols];

  const rows = gradebook.students.map((st) => {
    const base = [
      `"${st.email}"`,
      `"${st.full_name || ''}"`,
      `"${st.username || ''}"`,
      `"${st.summary.completed_tasks}/${st.summary.total_tasks}"`,
      `"${st.summary.completion_rate}%"`,
      `"${st.summary.final_score}"`,
    ];
    const taskScores = st.grades.map((g) => {
      if (g.status === 'NOT_SUBMITTED') return '"Chưa nộp"';
      if (g.instructor_score != null) return `"${g.instructor_score} (AC)"`;
      return `"${g.status === 'ACCEPTED' ? 'AC (100)' : g.status}"`;
    });
    return [...base, ...taskScores].join(',');
  });

  const csvContent = '\\uFEFF' + [allHeaders.map((h) => `"${h}"`).join(','), ...rows].join('\\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `So_diem_${gradebook.class_name.replace(/\\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function getMSSV(email: string, username?: string | null, id?: string): string {
  // Ưu tiên trích xuất chuỗi số sinh viên từ email (vd: 20120123@student...)
  const emailMatch = email.match(/^(\d{6,10})/);
  if (emailMatch) return emailMatch[1];

  // Nếu username toàn số (vd: 20120123)
  if (username && /^\d{6,10}$/.test(username)) return username;

  // Nếu username chứa số
  const userMatch = username?.match(/\d{6,10}/);
  if (userMatch) return userMatch[0];

  // Fallback định danh sinh viên
  return `SV${(id || email.split('@')[0]).slice(0, 6).toUpperCase()}`;
}

export default function InstructorClassDetail() {
  const { t } = useTranslation();
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();

  const { data: classData, isLoading: isClassLoading, refetch: refetchClass } = useClassDetailQuery(classId);
  const { data: apiHomeworks = [], isLoading: isHwLoading, refetch: refetchHw } = useClassHomeworksQuery(classId);
  const { createHomework, deleteHomework } = useHomework();

  const [activeTab, setActiveTab] = useState<'homework' | 'members' | 'gradebook'>('homework');
  const { data: gradebookData, isLoading: isGradebookLoading, refetch: refetchGradebook } = useClassGradebookQuery(classId);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<'stt' | 'name_asc' | 'name_desc' | 'mssv_asc' | 'mssv_desc' | 'rating_desc' | 'subs_desc'>('stt');
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
  const [viewHw, setViewHw] = useState<any | null>(null);
  const [confirmDeleteHwId, setConfirmDeleteHwId] = useState<string | null>(null);
  const [confirmKickStudent, setConfirmKickStudent] = useState<{ id: string; name: string } | null>(null);
  const [isKicking, setIsKicking] = useState(false);

  // Edit class state
  const [showEditClass, setShowEditClass] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', semester: '', description: '' });
  const [editError, setEditError] = useState('');
  const [isUpdatingClass, setIsUpdatingClass] = useState(false);

  // Add student state
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [addStudentError, setAddStudentError] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  const hasDocument = typeof document !== 'undefined';
  const { showToast } = useToast();

  // Quick-grading state for Gradebook matrix
  const [quickGradingItem, setQuickGradingItem] = useState<{
    student: ClassGradebookStudent;
    grade: ClassGradeItem;
  } | null>(null);
  const [quickScoreInput, setQuickScoreInput] = useState<string>('');
  const [quickFeedbackInput, setQuickFeedbackInput] = useState<string>('');
  const [isSubmittingQuickGrade, setIsSubmittingQuickGrade] = useState(false);

  const { data: quickSubDetail, isLoading: isQuickSubLoading } = useSubmissionDetailQuery(
    quickGradingItem?.grade.submission_id || undefined
  );

  const handleOpenQuickGrade = (student: ClassGradebookStudent, grade: ClassGradeItem) => {
    if (!grade.submission_id) return;
    setQuickGradingItem({ student, grade });
    setQuickScoreInput(grade.instructor_score != null ? String(grade.instructor_score) : '');
    setQuickFeedbackInput(grade.instructor_feedback || '');
  };

  const handleSaveQuickGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickGradingItem?.grade.submission_id) return;
    const numScore = parseFloat(quickScoreInput);
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      showToast('Điểm số phải là số hợp lệ từ 0 đến 10 (hoặc 100).', 'error');
      return;
    }
    setIsSubmittingQuickGrade(true);
    try {
      await gradeSubmission(quickGradingItem.grade.submission_id, {
        instructor_score: numScore,
        instructor_feedback: quickFeedbackInput.trim(),
      });
      showToast('Đã lưu điểm và nhận xét thành công!', 'success');
      await refetchGradebook();
      setQuickGradingItem(null);
    } catch (err: any) {
      showToast(err?.message || 'Không thể lưu điểm chấm.', 'error');
    } finally {
      setIsSubmittingQuickGrade(false);
    }
  };

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
        const mssv = getMSSV(email, student.username, student.id);
        const displayName = student.username || email.split('@')[0] || mssv;
        return {
          stt: index + 1,
          id: student.id,
          email,
          username: student.username || email.split('@')[0] || mssv,
          displayName,
          mssv,
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
          m.email.toLowerCase().includes(q) ||
          m.mssv.toLowerCase().includes(q) ||
          m.username.toLowerCase().includes(q)
      );
    }

    const sorted = [...result];
    if (sortKey === 'name_asc') sorted.sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi'));
    else if (sortKey === 'name_desc') sorted.sort((a, b) => b.displayName.localeCompare(a.displayName, 'vi'));
    else if (sortKey === 'mssv_asc') sorted.sort((a, b) => a.mssv.localeCompare(b.mssv));
    else if (sortKey === 'mssv_desc') sorted.sort((a, b) => b.mssv.localeCompare(a.mssv));
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
      await createHomework({
        title: hwForm.title.trim(),
        description: hwForm.description.trim(),
        deadline: hwForm.deadline.replace('T', ' '),
        problems: hwProblems,
        classId: classData.id,
        className: `${classData.name} - ${classData.invite_code}`,
        totalStudents: rawMembers.length,
      });
      await refetchHw();
      await refetchClass();
      setShowCreateHw(false);
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
      semester: classData.semester || 'Học kỳ 1 - 2024/2025',
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
    setIsUpdatingClass(true);
    setEditError('');
    try {
      await updateClassApi(classId, {
        name: editForm.name.trim(),
        semester: editForm.semester,
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
        <div className="w-8 h-8 border-2 border-[#193a2b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="text-center py-20 bg-white border border-[#e5dac9] rounded-2xl shadow-sm">
        <GraduationCap size={48} className="text-[#bfae99] mx-auto mb-4" />
        <h3 className="text-lg font-bold text-[#191919]">{t('instructorClassDetail.notFoundTitle')}</h3>
        <p className="text-sm text-[#8a8073] mt-1 mb-5">{t('instructorClassDetail.notFoundSubtitle')}</p>
        <button
          onClick={() => navigate('/instructor/classes')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#193a2b] text-white text-sm font-medium rounded-xl hover:bg-[#143022] shadow-sm"
        >
          <ArrowLeft size={16} /> {t('instructorClassDetail.backToClassList')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#191919] max-w-7xl mx-auto">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-[#8a8073]">
          <button
            onClick={() => navigate('/instructor/classes')}
            className="hover:text-[#193a2b] transition-colors flex items-center gap-1 font-medium"
          >
            <ArrowLeft size={16} /> {t('instructorClassDetail.backLabel')}
          </button>
          <span>/</span>
          <span className="text-[#191919] font-semibold truncate">{classData.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#f0ebd9] border border-[#e5dac9] rounded-xl text-xs font-mono text-[#5c5446]">
            <Link2 size={13} className="text-[#193a2b]" />
            <span>{displayInviteUrl}</span>
          </div>
          <button
            onClick={() => copy(fullInviteUrl, 'link')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#193a2b] text-white text-xs font-semibold rounded-xl hover:bg-[#143022] transition-colors shadow-sm"
            title={t('instructorClassDetail.copyFullInviteLinkTooltip')}
          >
            {copied === 'link' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied === 'link' ? t('instructorClass.copiedLabel') : t('instructorClass.copyLinkLabel')}</span>
          </button>
          <button
            onClick={() => copy(classData.invite_code || '', 'code')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#f0ebd9] border border-[#e5dac9] text-xs font-semibold text-[#193a2b] rounded-xl hover:bg-[#e5dac9] transition-colors"
            title={t('instructorClass.copyClassCode')}
          >
            {copied === 'code' ? <Check size={14} className="text-emerald-700" /> : <Hash size={14} />}
            <span className="font-mono">{displayCode}</span>
          </button>
          <button
            onClick={openEditModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f0ebd9] border border-[#e5dac9] text-xs font-semibold text-[#193a2b] rounded-xl hover:bg-[#e5dac9] transition-colors"
            title={t('instructorClassDetail.editClassInfoTooltip')}
          >
            <Edit3 size={13} />
            <span>{t('instructorClassDetail.editClassBtn')}</span>
          </button>
        </div>
      </div>

      {/* Class Banner / Header Card */}
      <div className="bg-white border border-[#e5dac9] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-linear-to-br from-[#193a2b] to-[#2d5a3f] rounded-2xl flex items-center justify-center text-white shadow-md shrink-0">
              <GraduationCap size={28} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold font-serif text-[#191919]">{classData.name}</h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-[#f0ebd9] text-[#193a2b] border border-[#e5dac9]">
                  {classData.semester || t('instructorClassDetail.defaultSemesterLabel')}
                </span>
              </div>
              <p className="text-sm text-[#5c5446] max-w-2xl leading-relaxed">
                {classData.description || t('instructorClassDetail.noDescriptionLong')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-[#e5dac9] pt-4 md:pt-0 md:pl-6">
            <div className="text-center md:text-left">
              <p className="text-xs text-[#8a8073] font-medium">{t('instructorClassDetail.studentsStatLabel')}</p>
              <p className="text-2xl font-bold text-[#193a2b]">{rawMembers.length}</p>
            </div>
            <div className="text-center md:text-left">
              <p className="text-xs text-[#8a8073] font-medium">{t('instructorClassDetail.homeworkStatLabel')}</p>
              <p className="text-2xl font-bold text-[#193a2b]">{apiHomeworks.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-3 border-b border-[#e5dac9]">
        <button
          onClick={() => setActiveTab('homework')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'homework'
              ? 'border-[#193a2b] text-[#193a2b]'
              : 'border-transparent text-[#8a8073] hover:text-[#191919]'
          }`}
        >
          <ClipboardList size={17} />
          {t('instructorClassDetail.homeworkStatLabel')}
          <span className="px-2 py-0.5 text-xs rounded-full bg-[#f0ebd9] text-[#193a2b] font-mono">
            {apiHomeworks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'members'
              ? 'border-[#193a2b] text-[#193a2b]'
              : 'border-transparent text-[#8a8073] hover:text-[#191919]'
          }`}
        >
          <Users size={17} />
          {t('instructorClassDetail.membersTab')}
          <span className="px-2 py-0.5 text-xs rounded-full bg-[#f0ebd9] text-[#193a2b] font-mono">
            {rawMembers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('gradebook')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'gradebook'
              ? 'border-[#193a2b] text-[#193a2b]'
              : 'border-transparent text-[#8a8073] hover:text-[#191919]'
          }`}
        >
          <GraduationCap size={17} />
          Sổ điểm (Gradebook)
          {gradebookData && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-[#f0ebd9] text-[#193a2b] font-mono">
              {gradebookData.students.length}
            </span>
          )}
        </button>
      </div>

      {/* ================= TAB 1: BÀI TẬP ================= */}
      {activeTab === 'homework' && (
        <div className="space-y-4 animate-fade-in">
          {/* Section Header (Tier 1: Synchronized with Members tab) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#193a2b]/10 text-[#193a2b] flex items-center justify-center shadow-2xs shrink-0">
                <ClipboardList size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold font-serif text-[#191919]">{t('instructorClassDetail.hwSectionTitle')}</h2>
                <p className="text-xs text-[#8a8073]">{t('instructorClassDetail.hwSectionSubtitle')}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setHwForm({ title: '', description: '', deadline: '' });
                setHwProblems([]);
                setHwError('');
                setShowCreateHw(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#193a2b] text-white text-xs font-semibold rounded-xl hover:bg-[#143022] transition-colors shadow-sm shrink-0"
            >
              <Plus size={15} /> {t('instructorClassDetail.createHwBtn')}
            </button>
          </div>

          {/* Search & Filter Toolbar (Tier 2: Synchronized with Members tab) */}
          <div className="bg-white border border-[#e5dac9] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a8073]" />
              <input
                value={hwSearchQuery}
                onChange={(e) => setHwSearchQuery(e.target.value)}
                placeholder={t('instructorClassDetail.hwSearchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl text-sm text-[#191919] placeholder:text-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
              />
              {hwSearchQuery && (
                <button
                  onClick={() => setHwSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8073] hover:text-[#191919]"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl text-xs font-semibold shrink-0">
              <button
                onClick={() => setHwStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  hwStatusFilter === 'all' ? 'bg-[#193a2b] text-white shadow-xs' : 'text-[#8a8073] hover:text-[#191919]'
                }`}
              >
                {t('instructorClassDetail.filterAll', { count: apiHomeworks.length })}
              </button>
              <button
                onClick={() => setHwStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  hwStatusFilter === 'active' ? 'bg-[#193a2b] text-white shadow-xs' : 'text-[#8a8073] hover:text-[#191919]'
                }`}
              >
                {t('instructorClassDetail.filterActive', { count: activeHwCount })}
              </button>
              <button
                onClick={() => setHwStatusFilter('overdue')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  hwStatusFilter === 'overdue' ? 'bg-[#193a2b] text-white shadow-xs' : 'text-[#8a8073] hover:text-[#191919]'
                }`}
              >
                {t('instructorClassDetail.filterOverdue', { count: overdueHwCount })}
              </button>
            </div>
          </div>

          {/* List Header Summary Bar */}
          <div className="px-5 py-3 border border-[#e5dac9] rounded-xl bg-[#f7f4eb] flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-[#5c5446]">
              {t('instructorClassDetail.hwListHeader', { count: filteredHomeworks.length })}
            </span>
            <span className="text-[#8a8073]">
              {t('instructorClassDetail.hwShowingCount', { shown: filteredHomeworks.length, total: apiHomeworks.length })}
            </span>
          </div>

          {apiHomeworks.length === 0 ? (
            <div className="bg-white border border-[#e5dac9] rounded-2xl p-12 text-center shadow-sm">
              <ClipboardList size={42} className="text-[#bfae99] mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#191919]">{t('instructorClassDetail.hwEmptyTitle')}</h3>
              <p className="text-sm text-[#8a8073] mt-1 mb-5 max-w-md mx-auto">
                {t('instructorClassDetail.hwEmptySubtitle')}
              </p>
            </div>
          ) : filteredHomeworks.length === 0 ? (
            <div className="bg-white border border-[#e5dac9] rounded-2xl p-10 text-center shadow-sm">
              <Search size={36} className="text-[#bfae99] mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#191919]">{t('instructorClassDetail.hwNoMatchTitle')}</h3>
              <p className="text-xs text-[#8a8073] mt-1">
                {t('instructorClassDetail.hwNoMatchSubtitle')}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredHomeworks.map((hw: any) => {
                const p = deadlineProgress(hw.deadline);
                const problemsCount = Array.isArray(hw.tasks) ? hw.tasks.length : hw.problemCount ?? 0;
                const submittedCount = hw.submittedStudents ?? 0;

                return (
                  <div
                    key={hw.id}
                    className="bg-white border border-[#e5dac9] rounded-2xl p-5 hover:border-[#193a2b]/30 hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="text-base font-bold text-[#191919] truncate">{hw.title}</h3>
                        <span
                          className={`text-xs font-semibold flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${
                            p.overdue
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : p.daysLeft <= 3
                              ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          <Clock size={11} /> {p.label}
                        </span>
                      </div>

                      <p className="text-xs text-[#8a8073] line-clamp-1 mb-3">
                        {hw.description || t('instructorClassDetail.hwNoDescription')}
                      </p>

                      <div className="flex flex-wrap items-center gap-5 text-xs text-[#5c5446]">
                        <span className="flex items-center gap-1">
                          <BookOpen size={13} className="text-[#193a2b]" /> {t('instructorClass.problemsCountSuffix', { count: problemsCount })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className="text-[#193a2b]" /> {t('instructorClassDetail.deadlineLabel', { date: formatVNFull(hw.deadline) })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={13} className="text-[#193a2b]" /> {t('instructorClassDetail.progressLabel', { submitted: submittedCount, total: rawMembers.length })}
                        </span>
                      </div>

                      <div className="w-full max-w-md h-1.5 bg-[#f0ebd9] rounded-full overflow-hidden mt-2.5">
                        <div
                          className={`h-full rounded-full transition-all ${
                            p.overdue ? 'bg-red-600' : p.daysLeft <= 3 ? 'bg-yellow-500' : 'bg-[#193a2b]'
                          }`}
                          style={{
                            width: `${rawMembers.length > 0 ? Math.min(100, (submittedCount / rawMembers.length) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setViewHw(hw)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#f0ebd9] text-[#191919] text-xs font-semibold rounded-xl hover:bg-[#e5dac9] transition-colors"
                      >
                        <Eye size={14} /> {t('instructorClassDetail.viewDetailBtn')}
                      </button>

                      {confirmDeleteHwId === hw.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDeleteHomework(hw.id)}
                            className="px-2.5 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-500"
                          >
                            {t('common.delete')}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteHwId(null)}
                            className="px-2.5 py-1.5 bg-[#f0ebd9] text-[#5c5446] text-xs font-semibold rounded-lg hover:bg-[#e5dac9]"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteHwId(hw.id)}
                          className="p-2 text-[#8a8073] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
              <div className="w-10 h-10 rounded-xl bg-[#193a2b]/10 text-[#193a2b] flex items-center justify-center shadow-2xs shrink-0">
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold font-serif text-[#191919]">{t('instructorClassDetail.membersSectionTitle')}</h2>
                <p className="text-xs text-[#8a8073]">{t('instructorClassDetail.membersSectionSubtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => { setStudentEmail(''); setAddStudentError(''); setShowAddStudent(true); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#193a2b] text-white text-xs font-semibold rounded-xl hover:bg-[#143022] transition-colors shadow-sm"
                title={t('instructorClassDetail.addStudentTooltip')}
              >
                <UserPlus size={14} />
                <span>{t('instructorClassDetail.addStudentBtn')}</span>
              </button>
              <button
                onClick={() => copy(classData.invite_code || '', 'code')}
                className="inline-flex items-center gap-1 px-2.5 py-2 bg-[#f0ebd9] border border-[#e5dac9] text-xs font-semibold text-[#193a2b] rounded-xl hover:bg-[#e5dac9] transition-colors"
                title={t('instructorClass.copyClassCode')}
              >
                {copied === 'code' ? <Check size={14} className="text-emerald-700" /> : <Hash size={14} />}
                {t('instructorClassDetail.codeWithPrefix', { code: displayCode })}
              </button>
              <button
                onClick={() => copy(fullInviteUrl, 'link')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#f0ebd9] text-[#191919] border border-[#e5dac9] text-xs font-semibold rounded-xl hover:bg-[#e5dac9] transition-colors shadow-xs"
                title={t('instructorClassDetail.copyInviteLinkTooltip')}
              >
                {copied === 'link' ? <Check size={14} className="text-emerald-700" /> : <Link2 size={14} />}
                {t('instructorClass.copyLinkLabel')}
              </button>
            </div>
          </div>

          {/* Search & Sort Toolbar (Tier 2: Synchronized with Homework tab) */}
          <div className="bg-white border border-[#e5dac9] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a8073]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('instructorClassDetail.membersSearchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl text-sm text-[#191919] placeholder:text-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8073] hover:text-[#191919]"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2 shrink-0">
              <ArrowUpDown size={15} className="text-[#8a8073]" />
              <span className="text-xs font-semibold text-[#8a8073] uppercase tracking-wider">{t('instructorClassDetail.sortLabel')}</span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as any)}
                className="px-3 py-2 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl text-xs font-semibold text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
              >
                <option value="stt">{t('instructorClassDetail.sortJoinOrder')}</option>
                <option value="name_asc">{t('instructorClassDetail.sortNameAsc')}</option>
                <option value="name_desc">{t('instructorClassDetail.sortNameDesc')}</option>
                <option value="mssv_asc">{t('instructorClassDetail.sortMssvAsc')}</option>
                <option value="mssv_desc">{t('instructorClassDetail.sortMssvDesc')}</option>
                <option value="rating_desc">{t('instructorClassDetail.sortRatingDesc')}</option>
                <option value="subs_desc">{t('instructorClassDetail.sortSubsDesc')}</option>
              </select>
            </div>
          </div>

          {/* Members Table Card */}
          <div className="bg-white border border-[#e5dac9] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#e5dac9] bg-[#f7f4eb] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5c5446]">
                {t('instructorClassDetail.membersListHeader', { count: filteredMembers.length })}
              </span>
              <span className="text-xs text-[#8a8073]">
                {t('instructorClassDetail.membersShowingCount', { shown: filteredMembers.length, total: rawMembers.length })}
              </span>
            </div>

            {filteredMembers.length === 0 ? (
              <div className="p-12 text-center">
                <Users size={36} className="text-[#bfae99] mx-auto mb-3" />
                <p className="font-semibold text-[#191919]">
                  {searchQuery ? t('instructorClassDetail.noStudentsFound') : t('instructorClassDetail.noStudentsYet')}
                </p>
                <p className="text-xs text-[#8a8073] mt-1">
                  {searchQuery
                    ? t('instructorClassDetail.noStudentsFoundHint')
                    : t('instructorClassDetail.noStudentsYetHint')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#e5dac9] bg-[#faf8f2] text-[11px] font-bold text-[#8a8073] uppercase tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">{t('instructorClassDetail.colStt')}</th>
                      <th className="py-3 px-4">{t('instructorClassDetail.colMssv')}</th>
                      <th className="py-3 px-4">{t('instructorClass.colStudent')}</th>
                      <th className="py-3 px-4">{t('instructorClassDetail.colEmail')}</th>
                      <th className="py-3 px-4 text-center">{t('instructorClassDetail.colSubmissions')}</th>
                      <th className="py-3 px-4 text-center">{t('instructorClassDetail.colRating')}</th>
                      <th className="py-3 px-4">{t('instructorClassDetail.colJoinedDate')}</th>
                      <th className="py-3 px-4 text-right">{t('instructorClassDetail.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5dac9] text-sm">
                    {filteredMembers.map((m, idx) => (
                      <tr key={m.id} className="hover:bg-[#f7f4eb]/60 transition-colors">
                        <td className="py-3.5 px-4 text-center text-xs font-semibold text-[#8a8073]">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#f0ebd9] border border-[#e5dac9] text-xs font-mono font-bold text-[#193a2b]">
                            {m.mssv}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#193a2b] to-[#2d5a3f] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                              {m.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-xs text-[#191919]">{m.displayName}</p>
                              <p className="text-[11px] text-[#8a8073]">@{m.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-[#5c5446]">
                          {m.email}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f0ebd9] text-[#193a2b]">
                            {t('instructorClassDetail.submissionsCountSuffix', { count: m.submissionsCount })}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="text-xs font-bold text-[#193a2b]">
                            {m.rating}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[#8a8073]">
                          {m.joinedAt ? formatVN(m.joinedAt, { time: false }) : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setConfirmKickStudent({ id: m.id, name: m.displayName })}
                            className="p-1.5 text-[#8a8073] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center shadow-2xs shrink-0">
                <GraduationCap size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold font-serif text-[#191919]">Sổ điểm tổng hợp lớp học</h2>
                <p className="text-xs text-[#8a8073]">Theo dõi ma trận tiến độ nộp bài, điểm số tự động và điểm giảng viên chấm cho từng bài tập.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => refetchGradebook()}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#e5dac9] text-xs font-semibold rounded-xl text-[#5c5446] hover:text-[#191919] hover:bg-[#f7f4eb] transition-all shadow-2xs"
                title="Tải lại dữ liệu sổ điểm"
              >
                <RotateCcw size={13} className={isGradebookLoading ? 'animate-spin' : ''} />
                Làm mới
              </button>
              {gradebookData && gradebookData.students.length > 0 && (
                <button
                  onClick={() => exportGradebookCsv(gradebookData)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#193a2b] text-white text-xs font-semibold rounded-xl hover:bg-[#143022] transition-colors shadow-sm"
                  title="Xuất bảng điểm ra file CSV (tương thích Excel tiếng Việt)"
                >
                  <Download size={14} />
                  Xuất Excel / CSV
                </button>
              )}
            </div>
          </div>

          {/* Gradebook Matrix Table */}
          {isGradebookLoading ? (
            <div className="p-16 text-center text-sm text-[#8a8073]">Đang tổng hợp dữ liệu sổ điểm...</div>
          ) : !gradebookData || gradebookData.students.length === 0 ? (
            <div className="p-12 text-center bg-white border border-[#e5dac9] rounded-2xl">
              <GraduationCap size={40} className="text-[#bfae99] mx-auto mb-3" />
              <p className="text-sm font-semibold text-[#191919]">Chưa có dữ liệu sổ điểm</p>
              <p className="text-xs text-[#8a8073] mt-1">Lớp học chưa có sinh viên hoặc chưa được giao bài tập nào.</p>
            </div>
          ) : (
            <div className="bg-white border border-[#e5dac9] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f0ebd9]/60 border-b border-[#e5dac9]">
                      <th className="py-3 px-4 font-bold text-[#5c5446] uppercase tracking-wider sticky left-0 bg-[#f0ebd9] z-10 min-w-[200px]">
                        Sinh viên
                      </th>
                      <th className="py-3 px-3 font-bold text-[#5c5446] uppercase tracking-wider text-center min-w-[100px]">
                        Tiến độ AC
                      </th>
                      <th className="py-3 px-3 font-bold text-[#5c5446] uppercase tracking-wider text-center min-w-[90px]">
                        Điểm TB (10)
                      </th>
                      {gradebookData.homework_columns.map((hw) =>
                        hw.tasks.map((t) => (
                          <th
                            key={`${hw.homework_id}_${t.task_id}`}
                            className="py-3 px-3 font-semibold text-[#5c5446] text-center border-l border-[#e5dac9]/60 min-w-[130px]"
                            title={`${hw.homework_title} - ${t.title}`}
                          >
                            <span className="block font-bold text-[#191919] truncate max-w-[120px]">{t.title}</span>
                            <span className="text-[10px] text-[#8a8073] block truncate max-w-[120px]">
                              {hw.homework_title}
                            </span>
                          </th>
                        ))
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5dac9]/60">
                    {gradebookData.students.map((st) => (
                      <tr key={st.id} className="hover:bg-[#f7f4eb]/60 transition-colors">
                        <td className="py-3 px-4 sticky left-0 bg-white hover:bg-[#f7f4eb]/60 z-10 border-r border-[#e5dac9]/40">
                          <p className="font-bold text-[#191919]">{st.full_name || st.username || 'Sinh viên'}</p>
                          <p className="text-[11px] text-[#8a8073] font-mono">{st.email}</p>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-[#193a2b]">
                              {st.summary.completed_tasks}/{st.summary.total_tasks}
                            </span>
                            <div className="w-16 h-1.5 bg-[#e5dac9] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-600 rounded-full"
                                style={{ width: `${st.summary.completion_rate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg font-bold ${
                              st.summary.final_score >= 8
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : st.summary.final_score >= 5
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}
                          >
                            {st.summary.final_score.toFixed(1)}
                          </span>
                        </td>
                        {st.grades.map((g, gIdx) => {
                          const isAc = g.status === 'ACCEPTED';
                          const isNotSub = g.status === 'NOT_SUBMITTED';
                          return (
                            <td
                              key={gIdx}
                              onClick={() => {
                                if (g.submission_id) {
                                  handleOpenQuickGrade(st, g);
                                }
                              }}
                              className={`py-3 px-2 text-center border-l border-[#e5dac9]/40 ${
                                g.submission_id
                                  ? 'cursor-pointer hover:bg-amber-100/60 transition-all group'
                                  : ''
                              }`}
                              title={g.submission_id ? 'Click để xem bài nộp & chấm điểm trực tiếp' : 'Sinh viên chưa nộp bài'}
                            >
                              {isNotSub ? (
                                <span className="text-[#bfae99]">—</span>
                              ) : isAc ? (
                                <div className="inline-flex flex-col items-center group-hover:scale-105 transition-transform">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                                    {g.instructor_score != null ? `⭐ ${g.instructor_score}/10` : 'AC (100)'}
                                    <Edit3 size={9} className="opacity-0 group-hover:opacity-100 text-emerald-900 transition-opacity" />
                                  </span>
                                  {g.instructor_feedback && (
                                    <span className="text-[9px] text-[#8a8073] italic truncate max-w-[110px]" title={g.instructor_feedback}>
                                      "{g.instructor_feedback}"
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="inline-flex flex-col items-center group-hover:scale-105 transition-transform">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300 flex items-center gap-1 shadow-2xs">
                                    {g.instructor_score != null ? `⭐ ${g.instructor_score}/10 (${g.status})` : g.status}
                                    <Edit3 size={9} className="opacity-0 group-hover:opacity-100 text-red-900 transition-opacity" />
                                  </span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: GIAO BÀI TẬP MỚI ================= */}
      {showCreateHw && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-90 flex items-center justify-center p-4" onClick={() => setShowCreateHw(false)}>
          <div className="bg-white border border-[#e5dac9] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5dac9]">
              <div>
                <h3 className="font-bold font-serif text-[16px] text-[#191919]">{t('instructorClassDetail.createHwBtn')}</h3>
                <p className="text-xs text-[#8a8073] mt-0.5">{t('instructorClassDetail.createHwModalClassLabel', { name: classData.name, code: classData.invite_code })}</p>
              </div>
              <button onClick={() => setShowCreateHw(false)} className="text-[#8a8073] hover:text-[#191919]"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5c5446] mb-1.5">{t('instructorClassDetail.fieldHwTitle')}</label>
                <input
                  value={hwForm.title}
                  onChange={(e) => setHwForm({ ...hwForm, title: e.target.value })}
                  placeholder={t('instructorClassDetail.fieldHwTitlePlaceholder')}
                  className="w-full px-4 py-2.5 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl text-sm text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5c5446] mb-1.5">{t('instructorClassDetail.fieldHwDeadline')}</label>
                <input
                  type="datetime-local"
                  value={hwForm.deadline}
                  onChange={(e) => setHwForm({ ...hwForm, deadline: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl text-sm text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5c5446] mb-1.5">{t('instructorClassDetail.fieldHwDescriptionLabel')}</label>
                <textarea
                  value={hwForm.description}
                  onChange={(e) => setHwForm({ ...hwForm, description: e.target.value })}
                  rows={2}
                  placeholder={t('instructorClassDetail.fieldHwDescriptionPlaceholder')}
                  className="w-full px-4 py-2.5 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl text-sm text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b] resize-none"
                />
              </div>

              {/* Problem Manager */}
              <div className="pt-2">
                <ProblemManager problems={hwProblems} onChange={setHwProblems} />
              </div>

              {hwError && <p className="text-xs text-red-600 font-medium">{hwError}</p>}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e5dac9]">
                <button
                  onClick={() => setShowCreateHw(false)}
                  disabled={isSavingHw}
                  className="px-5 py-2.5 border border-[#e5dac9] text-[#5c5446] text-xs font-semibold rounded-xl hover:bg-[#f0ebd9] transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSaveHomework}
                  disabled={isSavingHw}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#193a2b] text-white text-xs font-semibold rounded-xl hover:bg-[#143022] shadow-sm disabled:opacity-50"
                >
                  {isSavingHw && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {t('instructorClassDetail.saveAndAssignHw')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ================= MODAL: XEM CHI TIẾT BÀI TẬP ================= */}
      {viewHw && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-90 flex items-center justify-center p-4" onClick={() => setViewHw(null)}>
          <div className="bg-white border border-[#e5dac9] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#e5dac9] pb-3">
              <h3 className="font-bold font-serif text-base text-[#191919]">{viewHw.title}</h3>
              <button onClick={() => setViewHw(null)} className="text-[#8a8073] hover:text-[#191919]"><X size={16} /></button>
            </div>
            <p className="text-sm text-[#5c5446]">{viewHw.description || t('instructorClassDetail.viewHwModalNoDescription')}</p>
            <div className="p-3 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl text-xs space-y-1">
              <p><strong className="text-[#191919]">{t('instructorClassDetail.deadlineInlineLabel')}</strong> {formatVNFull(viewHw.deadline)}</p>
              <p><strong className="text-[#191919]">{t('instructorClassDetail.problemCountFieldLabel')}</strong> {Array.isArray(viewHw.tasks) ? viewHw.tasks.length : viewHw.problemCount ?? 0}</p>
            </div>

            {Array.isArray(viewHw.tasks) && viewHw.tasks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-[#5c5446] uppercase">{t('instructorClassDetail.problemListLabel')}</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {viewHw.tasks.map((task: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-[#f7f4eb] rounded-lg text-xs">
                      <span className="font-semibold text-[#191919] truncate">{i + 1}. {task.title}</span>
                      <span className="text-[#193a2b] font-bold">{task.points ?? 100} {t('instructorClassDetail.pointsSuffix')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setViewHw(null)}
              className="w-full py-2 bg-[#193a2b] text-white text-xs font-semibold rounded-xl hover:bg-[#143022]"
            >
              {t('instructorClassDetail.closeBtn')}
            </button>
          </div>
        </div>
      ), document.body)}

      {/* ================= MODAL: CONFIRM KICK SINH VIÊN ================= */}
      {confirmKickStudent && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-90 flex items-center justify-center p-4" onClick={() => setConfirmKickStudent(null)}>
          <div className="bg-white border border-[#e5dac9] rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <UserX size={24} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#191919]">{t('instructorClassDetail.kickConfirmTitle')}</h3>
              <p className="text-xs text-[#8a8073] mt-1">
                {t('instructorClassDetail.kickConfirmBody', { name: confirmKickStudent.name })}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmKickStudent(null)}
                disabled={isKicking}
                className="flex-1 py-2 border border-[#e5dac9] text-xs font-semibold rounded-xl hover:bg-[#f0ebd9]"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleKickStudent}
                disabled={isKicking}
                className="flex-1 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isKicking && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
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
                <p className="text-xs text-(--ws-muted) mt-0.5">{t('instructorClass.editModalCode', { code: classData.invite_code })}</p>
              </div>
              <button onClick={() => setShowEditClass(false)} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorClass.fieldClassName')}</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder={t('instructorClass.fieldClassNamePlaceholder')}
                  className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorClass.fieldSemester')}</label>
                <select
                  value={editForm.semester}
                  onChange={(e) => setEditForm({ ...editForm, semester: e.target.value })}
                  className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                >
                  <option>Học kỳ 1 - 2024/2025</option>
                  <option>Học kỳ 2 - 2024/2025</option>
                  <option>Học kỳ hè - 2024/2025</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorClass.fieldDescription')}</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  placeholder={t('instructorClass.fieldDescriptionPlaceholder')}
                  className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-[#193a2b] resize-none"
                />
              </div>
              {editError && <p className="text-xs text-red-600 font-medium">{editError}</p>}
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
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#193a2b] text-white text-xs font-semibold rounded-xl hover:bg-[#143022] shadow-sm disabled:opacity-50 transition-colors"
                >
                  {isUpdatingClass && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {t('instructorClass.saveChanges')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ================= MODAL: THÊM SINH VIÊN BẰNG EMAIL ================= */}
      {showAddStudent && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-85 flex items-center justify-center p-4" onClick={() => setShowAddStudent(false)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-2xl w-full max-w-md shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--ws-border)">
              <div>
                <h3 className="font-bold font-serif text-[16px]">{t('instructorClassDetail.addStudentModalTitle')}</h3>
                <p className="text-xs text-(--ws-muted) mt-0.5">{classData.name}</p>
              </div>
              <button onClick={() => setShowAddStudent(false)} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorClassDetail.fieldStudentEmail')}</label>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                  placeholder={t('instructorClassDetail.fieldStudentEmailPlaceholder')}
                  className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                  autoFocus
                />
                <p className="text-xs text-(--ws-muted) mt-1.5">
                  {t('instructorClassDetail.addStudentHint')}
                </p>
              </div>
              {addStudentError && <p className="text-xs text-red-600 font-medium">{addStudentError}</p>}
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
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#193a2b] text-white text-xs font-semibold rounded-xl hover:bg-[#143022] shadow-sm disabled:opacity-50 transition-colors"
                >
                  {isAddingStudent && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {t('instructorClassDetail.addStudentBtn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ================= MODAL: CHẤM ĐIỂM NHANH TỪ SỔ ĐIỂM ================= */}
      {quickGradingItem && hasDocument && createPortal((
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
          onClick={() => setQuickGradingItem(null)}
        >
          <div
            className="bg-[#f7f4eb] border border-[#e5dac9] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5dac9] bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center font-bold">
                  <Award size={22} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#191919] flex items-center gap-2">
                    <span>{quickGradingItem.grade.task_title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-sans font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {quickGradingItem.grade.status}
                    </span>
                  </h3>
                  <p className="text-xs text-[#8a8073]">
                    Sinh viên: <span className="font-semibold text-[#5c5446]">{quickGradingItem.student.full_name || quickGradingItem.student.username}</span> ({quickGradingItem.student.email}) • Bài tập: {quickGradingItem.grade.homework_title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuickGradingItem(null)}
                className="p-1.5 hover:bg-[#e5dac9]/50 rounded-lg text-[#8a8073] hover:text-[#191919] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Grading Form */}
              <form onSubmit={handleSaveQuickGrade} className="bg-white p-5 rounded-xl border border-amber-300/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#e5dac9]/60 pb-3">
                  <div className="flex items-center gap-2 text-amber-950 font-serif font-bold text-sm">
                    <Award size={18} className="text-amber-700" />
                    <span>Đánh giá sư phạm & Chấm điểm</span>
                  </div>
                  <span className="text-xs text-[#8a8073] font-mono">
                    Điểm tự động: {quickGradingItem.grade.score}đ / Trọng số: {quickGradingItem.grade.points}đ
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#191919] mb-1">
                      Điểm GV chấm (Thang 10): *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={quickScoreInput}
                      onChange={(e) => setQuickScoreInput(e.target.value)}
                      placeholder="VD: 9.5"
                      required
                      className="w-full px-3 py-2 bg-[#f7f4eb] border border-[#e5dac9] rounded-lg text-sm text-[#191919] font-bold focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#191919] mb-1">
                      Lời nhận xét sư phạm:
                    </label>
                    <textarea
                      rows={2}
                      value={quickFeedbackInput}
                      onChange={(e) => setQuickFeedbackInput(e.target.value)}
                      placeholder="Nhận xét về thuật toán, tính tối ưu, trình bày code..."
                      className="w-full px-3 py-2 bg-[#f7f4eb] border border-[#e5dac9] rounded-lg text-xs text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e5dac9]/60">
                  <button
                    type="button"
                    onClick={() => setQuickGradingItem(null)}
                    disabled={isSubmittingQuickGrade}
                    className="px-4 py-2 border border-[#e5dac9] bg-white text-xs font-semibold rounded-lg text-[#5c5446] hover:bg-[#f7f4eb] transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingQuickGrade}
                    className="px-5 py-2 bg-[#193a2b] text-white text-xs font-semibold rounded-lg hover:bg-[#143022] transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmittingQuickGrade ? 'Đang lưu...' : 'Lưu điểm & Cập nhật Sổ điểm'}
                  </button>
                </div>
              </form>

              {/* Submitted Code Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5c5446] flex items-center gap-1.5">
                    <Code2 size={14} className="text-[#193a2b]" />
                    Mã nguồn sinh viên đã nộp
                  </h4>
                  {quickSubDetail && (
                    <span className="text-xs text-[#8a8073] font-mono">
                      Ngôn ngữ: {quickSubDetail.language} • {quickSubDetail.execution_time ? `${quickSubDetail.execution_time}ms` : ''}
                    </span>
                  )}
                </div>

                {isQuickSubLoading ? (
                  <div className="p-8 text-center text-xs text-[#8a8073] bg-white rounded-xl border border-[#e5dac9]">
                    Đang tải mã nguồn...
                  </div>
                ) : quickSubDetail?.source_code ? (
                  <div className="bg-[#242424] border border-[#333333] rounded-xl p-4 overflow-x-auto shadow-inner max-h-72">
                    <pre className="text-xs text-emerald-400 font-mono whitespace-pre">{quickSubDetail.source_code}</pre>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-[#8a8073] bg-white rounded-xl border border-[#e5dac9]">
                    Không thể tải mã nguồn của bài nộp này.
                  </div>
                )}
              </div>

              {/* Testcases summary if available */}
              {quickSubDetail?.test_results && quickSubDetail.test_results.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5c5446] mb-2">
                    Kết quả chi tiết các bộ test ({quickSubDetail.test_results.filter((r) => r.status === 'ACCEPTED').length}/{quickSubDetail.test_results.length} PASSED)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {quickSubDetail.test_results.map((tr, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg border text-center text-xs ${
                          tr.status === 'ACCEPTED'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-red-50 border-red-200 text-red-800'
                        }`}
                      >
                        <span className="font-bold block">TC #{tr.testcase_index ?? idx + 1}</span>
                        <span className="text-[10px] uppercase font-mono">{tr.status}</span>
                        {tr.execution_time != null && <span className="block text-[9px] opacity-75">{tr.execution_time}ms</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
