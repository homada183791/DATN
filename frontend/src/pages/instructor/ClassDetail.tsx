import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useClassDetailQuery, removeClassStudent } from '../../api/classes';
import { useClassHomeworksQuery } from '../../api/homeworks';
import { useHomework, deadlineProgress, HomeworkProblem } from '../../context/HomeworkContext';
import { formatVN, formatVNFull } from '../../utils/dateTime';
import ProblemManager from '../../components/ProblemManager';
import {
  GraduationCap,
  Users,
  ClipboardList,
  Calendar,
  Hash,
  Copy,
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
} from 'lucide-react';

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
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();

  const { data: classData, isLoading: isClassLoading, refetch: refetchClass } = useClassDetailQuery(classId);
  const { data: apiHomeworks = [], isLoading: isHwLoading, refetch: refetchHw } = useClassHomeworksQuery(classId);
  const { createHomework, deleteHomework } = useHomework();

  const [activeTab, setActiveTab] = useState<'homework' | 'members'>('homework');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<'stt' | 'name_asc' | 'name_desc' | 'mssv_asc' | 'mssv_desc' | 'rating_desc' | 'subs_desc'>('stt');
  const [copied, setCopied] = useState<string | null>(null);

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

  const hasDocument = typeof document !== 'undefined';

  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const inviteLink = classData?.invite_code ? `${window.location.origin}/join/${classData.invite_code}` : '';

  // Members list with derived data
  const rawMembers = useMemo(() => {
    if (!classData?.students) return [];
    return classData.students.map((item, index) => {
      const student = item.student;
      const mssv = getMSSV(student.email, student.username, student.id);
      const displayName = student.username || student.email.split('@')[0];
      return {
        stt: index + 1,
        id: student.id,
        email: student.email,
        username: student.username || student.email.split('@')[0],
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
      alert(e?.message || 'Có lỗi xảy ra khi xóa sinh viên');
    } finally {
      setIsKicking(false);
    }
  };

  // Handle Save Homework
  const handleSaveHomework = async () => {
    if (!classData) return;
    if (hwForm.title.trim().length < 3) return setHwError('Tiêu đề cần ít nhất 3 ký tự.');
    if (!hwForm.deadline) return setHwError('Vui lòng chọn hạn nộp.');
    if (hwProblems.length === 0) return setHwError('Cần ít nhất 1 bài toán trong bài tập.');
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
      setHwError(e.message || 'Có lỗi xảy ra khi giao bài.');
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
      alert(e?.message || 'Không thể xóa bài tập');
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
        <h3 className="text-lg font-bold text-[#191919]">Không tìm thấy lớp học</h3>
        <p className="text-sm text-[#8a8073] mt-1 mb-5">Lớp học này không tồn tại hoặc bạn không có quyền truy cập.</p>
        <button
          onClick={() => navigate('/instructor/classes')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#193a2b] text-white text-sm font-medium rounded-xl hover:bg-[#143022] shadow-sm"
        >
          <ArrowLeft size={16} /> Quay lại Danh sách lớp
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
            <ArrowLeft size={16} /> Lớp học
          </button>
          <span>/</span>
          <span className="text-[#191919] font-semibold truncate">{classData.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => copy(classData.invite_code, 'code')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f0ebd9] border border-[#e5dac9] text-xs font-semibold text-[#193a2b] rounded-lg hover:bg-[#e5dac9] transition-colors"
            title="Sao chép mã lớp"
          >
            {copied === 'code' ? <Check size={14} className="text-emerald-700" /> : <Hash size={14} />}
            Mã: <span className="font-mono">{classData.invite_code}</span>
          </button>
          <button
            onClick={() => copy(inviteLink, 'link')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#193a2b] text-white text-xs font-semibold rounded-lg hover:bg-[#143022] transition-colors shadow-sm"
            title="Sao chép link mời sinh viên"
          >
            {copied === 'link' ? <Check size={14} className="text-emerald-400" /> : <Link2 size={14} />}
            Sao chép link mời
          </button>
        </div>
      </div>

      {/* Class Banner / Header Card */}
      <div className="bg-white border border-[#e5dac9] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#193a2b] to-[#2d5a3f] rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0">
              <GraduationCap size={28} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold font-serif text-[#191919]">{classData.name}</h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-[#f0ebd9] text-[#193a2b] border border-[#e5dac9]">
                  {classData.semester || 'Học kỳ 1'}
                </span>
              </div>
              <p className="text-sm text-[#5c5446] max-w-2xl leading-relaxed">
                {classData.description || 'Chưa có phần giới thiệu chi tiết cho lớp học này.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-[#e5dac9] pt-4 md:pt-0 md:pl-6">
            <div className="text-center md:text-left">
              <p className="text-xs text-[#8a8073] font-medium">Sinh viên</p>
              <p className="text-2xl font-bold text-[#193a2b]">{rawMembers.length}</p>
            </div>
            <div className="text-center md:text-left">
              <p className="text-xs text-[#8a8073] font-medium">Bài tập</p>
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
          Bài tập
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
          Thành viên
          <span className="px-2 py-0.5 text-xs rounded-full bg-[#f0ebd9] text-[#193a2b] font-mono">
            {rawMembers.length}
          </span>
        </button>
      </div>

      {/* ================= TAB 1: BÀI TẬP ================= */}
      {activeTab === 'homework' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#191919]">Danh sách bài tập của lớp</h2>
              <p className="text-xs text-[#8a8073]">Quản lý bài tập, theo dõi tiến độ nộp và chấm điểm sinh viên.</p>
            </div>
            <button
              onClick={() => {
                setHwForm({ title: '', description: '', deadline: '' });
                setHwProblems([]);
                setHwError('');
                setShowCreateHw(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#193a2b] text-white text-sm font-semibold rounded-xl hover:bg-[#143022] transition-colors shadow-sm"
            >
              <Plus size={16} /> Giao bài tập mới
            </button>
          </div>

          {apiHomeworks.length === 0 ? (
            <div className="bg-white border border-[#e5dac9] rounded-2xl p-12 text-center shadow-sm">
              <ClipboardList size={42} className="text-[#bfae99] mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#191919]">Chưa có bài tập nào</h3>
              <p className="text-sm text-[#8a8073] mt-1 mb-5 max-w-md mx-auto">
                Hãy giao bài tập đầu tiên cho lớp để sinh viên luyện tập và nộp bài.
              </p>
              <button
                onClick={() => setShowCreateHw(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#193a2b] text-white text-sm font-semibold rounded-xl hover:bg-[#143022]"
              >
                <Plus size={16} /> Giao bài tập ngay
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {apiHomeworks.map((hw: any) => {
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
                        {hw.description || 'Chưa có mô tả chi tiết.'}
                      </p>

                      <div className="flex flex-wrap items-center gap-5 text-xs text-[#5c5446]">
                        <span className="flex items-center gap-1">
                          <BookOpen size={13} className="text-[#193a2b]" /> {problemsCount} bài toán
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className="text-[#193a2b]" /> Hạn nộp: {formatVNFull(hw.deadline)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={13} className="text-[#193a2b]" /> Tiến độ: {submittedCount}/{rawMembers.length} sinh viên đã nộp
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

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setViewHw(hw)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#f0ebd9] text-[#191919] text-xs font-semibold rounded-xl hover:bg-[#e5dac9] transition-colors"
                      >
                        <Eye size={14} /> Chi tiết đề bài
                      </button>

                      {confirmDeleteHwId === hw.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDeleteHomework(hw.id)}
                            className="px-2.5 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-500"
                          >
                            Xóa
                          </button>
                          <button
                            onClick={() => setConfirmDeleteHwId(null)}
                            className="px-2.5 py-1.5 bg-[#f0ebd9] text-[#5c5446] text-xs font-semibold rounded-lg hover:bg-[#e5dac9]"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteHwId(hw.id)}
                          className="p-2 text-[#8a8073] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa bài tập"
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
        <div className="space-y-4">
          {/* Controls: Search, Sort, Stats */}
          <div className="bg-white border border-[#e5dac9] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a8073]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo Tên, MSSV hoặc Email sinh viên..."
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
            <div className="flex items-center gap-2 flex-shrink-0">
              <ArrowUpDown size={15} className="text-[#8a8073]" />
              <span className="text-xs font-semibold text-[#8a8073] uppercase tracking-wider">Sắp xếp:</span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as any)}
                className="px-3 py-2 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl text-xs font-semibold text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
              >
                <option value="stt">Thứ tự gia nhập (STT)</option>
                <option value="name_asc">Tên: A → Z</option>
                <option value="name_desc">Tên: Z → A</option>
                <option value="mssv_asc">MSSV: Tăng dần</option>
                <option value="mssv_desc">MSSV: Giảm dần</option>
                <option value="rating_desc">Rating: Cao → Thấp</option>
                <option value="subs_desc">Bài nộp: Nhiều nhất</option>
              </select>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white border border-[#e5dac9] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#e5dac9] bg-[#f7f4eb] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5c5446]">
                Danh sách thành viên
              </span>
              <span className="text-xs text-[#8a8073]">
                Hiển thị <span className="font-semibold text-[#191919]">{filteredMembers.length}</span> / {rawMembers.length} sinh viên
              </span>
            </div>

            {filteredMembers.length === 0 ? (
              <div className="p-12 text-center">
                <Users size={36} className="text-[#bfae99] mx-auto mb-3" />
                <p className="font-semibold text-[#191919]">
                  {searchQuery ? 'Không tìm thấy sinh viên nào' : 'Lớp học chưa có sinh viên'}
                </p>
                <p className="text-xs text-[#8a8073] mt-1">
                  {searchQuery
                    ? 'Thử thay đổi từ khóa tìm kiếm MSSV, tên hoặc email.'
                    : 'Hãy chia sẻ mã lớp hoặc link mời để sinh viên tham gia.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#e5dac9] bg-[#faf8f2] text-[11px] font-bold text-[#8a8073] uppercase tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">STT</th>
                      <th className="py-3 px-4">MSSV</th>
                      <th className="py-3 px-4">Sinh viên</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4 text-center">Bài nộp</th>
                      <th className="py-3 px-4 text-center">Rating</th>
                      <th className="py-3 px-4">Ngày tham gia</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
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
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#193a2b] to-[#2d5a3f] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">
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
                            {m.submissionsCount} bài
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
                            title="Xóa sinh viên khỏi lớp"
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

      {/* ================= MODAL: GIAO BÀI TẬP MỚI ================= */}
      {showCreateHw && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[90] flex items-center justify-center p-4" onClick={() => setShowCreateHw(false)}>
          <div className="bg-white border border-[#e5dac9] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5dac9]">
              <div>
                <h3 className="font-bold font-serif text-[16px] text-[#191919]">Giao bài tập mới</h3>
                <p className="text-xs text-[#8a8073] mt-0.5">Lớp: {classData.name} ({classData.invite_code})</p>
              </div>
              <button onClick={() => setShowCreateHw(false)} className="text-[#8a8073] hover:text-[#191919]"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5c5446] mb-1.5">Tiêu đề bài tập *</label>
                <input
                  value={hwForm.title}
                  onChange={(e) => setHwForm({ ...hwForm, title: e.target.value })}
                  placeholder="VD: Bài tập Tuần 1 - Cây nhị phân tìm kiếm"
                  className="w-full px-4 py-2.5 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl text-sm text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5c5446] mb-1.5">Hạn nộp bài *</label>
                <input
                  type="datetime-local"
                  value={hwForm.deadline}
                  onChange={(e) => setHwForm({ ...hwForm, deadline: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl text-sm text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5c5446] mb-1.5">Mô tả & Hướng dẫn</label>
                <textarea
                  value={hwForm.description}
                  onChange={(e) => setHwForm({ ...hwForm, description: e.target.value })}
                  rows={2}
                  placeholder="Lưu ý khi nộp bài, định dạng code..."
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
                  Hủy
                </button>
                <button
                  onClick={handleSaveHomework}
                  disabled={isSavingHw}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#193a2b] text-white text-xs font-semibold rounded-xl hover:bg-[#143022] shadow-sm disabled:opacity-50"
                >
                  {isSavingHw && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Lưu & Giao bài tập
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ================= MODAL: XEM CHI TIẾT BÀI TẬP ================= */}
      {viewHw && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[90] flex items-center justify-center p-4" onClick={() => setViewHw(null)}>
          <div className="bg-white border border-[#e5dac9] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#e5dac9] pb-3">
              <h3 className="font-bold font-serif text-base text-[#191919]">{viewHw.title}</h3>
              <button onClick={() => setViewHw(null)} className="text-[#8a8073] hover:text-[#191919]"><X size={16} /></button>
            </div>
            <p className="text-sm text-[#5c5446]">{viewHw.description || 'Không có mô tả.'}</p>
            <div className="p-3 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl text-xs space-y-1">
              <p><strong className="text-[#191919]">Hạn nộp:</strong> {formatVNFull(viewHw.deadline)}</p>
              <p><strong className="text-[#191919]">Số bài toán:</strong> {Array.isArray(viewHw.tasks) ? viewHw.tasks.length : viewHw.problemCount ?? 0}</p>
            </div>

            {Array.isArray(viewHw.tasks) && viewHw.tasks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-[#5c5446] uppercase">Danh sách bài toán:</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {viewHw.tasks.map((t: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-[#f7f4eb] rounded-lg text-xs">
                      <span className="font-semibold text-[#191919] truncate">{i + 1}. {t.title}</span>
                      <span className="text-[#193a2b] font-bold">{t.points ?? 100} điểm</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setViewHw(null)}
              className="w-full py-2 bg-[#193a2b] text-white text-xs font-semibold rounded-xl hover:bg-[#143022]"
            >
              Đóng
            </button>
          </div>
        </div>
      ), document.body)}

      {/* ================= MODAL: CONFIRM KICK SINH VIÊN ================= */}
      {confirmKickStudent && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[90] flex items-center justify-center p-4" onClick={() => setConfirmKickStudent(null)}>
          <div className="bg-white border border-[#e5dac9] rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <UserX size={24} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#191919]">Xác nhận xóa sinh viên</h3>
              <p className="text-xs text-[#8a8073] mt-1">
                Bạn có chắc chắn muốn xóa sinh viên <strong className="text-[#191919]">{confirmKickStudent.name}</strong> ra khỏi lớp học này không?
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmKickStudent(null)}
                disabled={isKicking}
                className="flex-1 py-2 border border-[#e5dac9] text-xs font-semibold rounded-xl hover:bg-[#f0ebd9]"
              >
                Hủy
              </button>
              <button
                onClick={handleKickStudent}
                disabled={isKicking}
                className="flex-1 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isKicking && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
