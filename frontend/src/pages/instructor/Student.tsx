import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useClass } from '../../context/ClassContext';
import {
  Users,
  Search,
  Filter,
  TrendingUp,
  ChevronDown,
  X,
  Eye,
  GraduationCap,
  CheckCircle2,
} from 'lucide-react';

export default function InstructorStudent() {
  const { myClasses, membersOf } = useClass();
  const students = myClasses.flatMap((classInfo) => membersOf(classInfo.id).map((member) => ({
    id: member.username,
    username: member.username,
    fullName: member.fullName,
    email: `${member.username}@unknown.local`,
    solvedCount: member.solvedCount ?? 0,
    submissionCount: 0,
    rating: member.rating ?? 0,
    lastActive: '',
    classId: classInfo.id,
    className: `${classInfo.name} - ${classInfo.code}`,
  })));
  const classes = myClasses;
  const submissions: Array<{ id: string; userId: string; problemTitle: string; verdict: string; language: string; executionTime: number; timestamp: string }> = [];
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'solved' | 'submissions'>('rating');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const hasDocument = typeof document !== 'undefined';

  const filteredStudents = students
    .filter((s) => {
      const matchesSearch = s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.username.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = classFilter === 'all' || s.classId === classFilter;
      return matchesSearch && matchesClass;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'solved') return b.solvedCount - a.solvedCount;
      return b.submissionCount - a.submissionCount;
    });

  const selectedStudentData = students.find((s) => s.id === selectedStudent);
  const selectedStudentSubs = submissions.filter((s) => s.userId === selectedStudent);

  const acCount = selectedStudentSubs.filter((s) => s.verdict === 'AC').length;

  const verdictColors: Record<string, string> = {
    AC: 'text-emerald-800 bg-emerald-100 border-emerald-300',
    WA: 'text-red-800 bg-red-100 border-red-300',
    TLE: 'text-yellow-800 bg-yellow-100 border-yellow-300',
    MLE: 'text-yellow-800 bg-yellow-100 border-yellow-300',
    RTE: 'text-orange-800 bg-orange-100 border-orange-300',
    CE: 'text-blue-800 bg-blue-100 border-blue-300',
    PE: 'text-pink-800 bg-pink-100 border-pink-300',
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 2000) return 'text-yellow-600';
    if (rating >= 1800) return 'text-purple-700';
    if (rating >= 1600) return 'text-blue-700';
    if (rating >= 1400) return 'text-emerald-700';
    return 'text-[#5c5446]';
  };

  const getRatingBadge = (rating: number) => {
    if (rating >= 2000) return { label: 'Grandmaster', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    if (rating >= 1800) return { label: 'Candidate Master', color: 'bg-purple-100 text-purple-800 border-purple-200' };
    if (rating >= 1600) return { label: 'Expert', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    if (rating >= 1400) return { label: 'Specialist', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    return { label: 'Pupil', color: 'bg-[#f0ebd9] text-[#8a8073] border-[#e5dac9]' };
  };

  return (
    <div className="space-y-6 text-[#191919]">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-serif text-[#191919]">Quản lý sinh viên</h2>
        <span className="text-sm text-[#8a8073]">{filteredStudents.length} sinh viên</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e5dac9] rounded-xl p-4 text-center shadow-sm">
          <Users size={20} className="text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif text-[#191919]">{students.length}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Tổng sinh viên</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-4 text-center shadow-sm">
          <CheckCircle2 size={20} className="text-[#193a2b] mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif text-[#191919]">{students.filter((s) => s.solvedCount > 100).length}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Trên 100 bài</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-4 text-center shadow-sm">
          <TrendingUp size={20} className="text-[#cc5a37] mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif text-[#191919]">{Math.round(students.reduce((sum, s) => sum + s.rating, 0) / students.length)}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Rating TB</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-4 text-center shadow-sm">
          <GraduationCap size={20} className="text-yellow-600 mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif text-[#191919]">{classes.length}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Lớp học</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8073]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm sinh viên..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
            showFilters ? 'bg-[#193a2b]/10 border-[#193a2b]/30 text-[#193a2b]' : 'bg-white border-[#e5dac9] text-[#5c5446] hover:text-[#191919]'
          }`}
        >
          <Filter size={16} /> Bộ lọc <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-4 p-4 bg-white border border-[#e5dac9] rounded-xl shadow-sm">
          <div>
            <label className="block text-xs text-[#8a8073] mb-1.5 font-semibold uppercase tracking-wider">Lớp học</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-2 bg-[#f7f4eb] border border-[#e5dac9] rounded-lg text-sm text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
            >
              <option value="all">Tất cả</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#8a8073] mb-1.5 font-semibold uppercase tracking-wider">Sắp xếp</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'rating' | 'solved' | 'submissions')}
              className="px-3 py-2 bg-[#f7f4eb] border border-[#e5dac9] rounded-lg text-sm text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
            >
              <option value="rating">Rating</option>
              <option value="solved">Bài đã giải</option>
              <option value="submissions">Lượt nộp</option>
            </select>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && selectedStudentData && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-[80] flex items-center justify-center p-4" onClick={() => setSelectedStudent(null)}>
          <div className="bg-[var(--ws-panel)] border border-[var(--ws-border)] text-[var(--ws-text)] rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[var(--ws-border)]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#193a2b] to-[#2d5a3f] rounded-full flex items-center justify-center text-white text-lg font-bold font-serif">
                  {selectedStudentData.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-[var(--ws-text)]">{selectedStudentData.fullName}</h3>
                  <p className="text-sm text-[var(--ws-muted)]">@{selectedStudentData.username} • {selectedStudentData.className}</p>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="text-[var(--ws-muted)] hover:text-[var(--ws-text)]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              {/* Student Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="p-3 bg-[var(--ws-panel2)] rounded-xl border border-[var(--ws-border)] text-center shadow-xs">
                  <p className="text-lg font-serif font-bold text-[var(--ws-text)]">{selectedStudentData.solvedCount}</p>
                  <p className="text-xs text-[var(--ws-muted)] mt-0.5">Bài đã giải</p>
                </div>
                <div className="p-3 bg-[var(--ws-panel2)] rounded-xl border border-[var(--ws-border)] text-center shadow-xs">
                  <p className="text-lg font-serif font-bold text-[var(--ws-text)]">{selectedStudentData.submissionCount}</p>
                  <p className="text-xs text-[var(--ws-muted)] mt-0.5">Lượt nộp</p>
                </div>
                <div className="p-3 bg-[var(--ws-panel2)] rounded-xl border border-[var(--ws-border)] text-center shadow-xs">
                  <p className={`text-lg font-serif font-bold ${getRatingColor(selectedStudentData.rating)}`}>{selectedStudentData.rating}</p>
                  <p className="text-xs text-[var(--ws-muted)] mt-0.5">Rating</p>
                </div>
                <div className="p-3 bg-[var(--ws-panel2)] rounded-xl border border-[var(--ws-border)] text-center shadow-xs">
                  <p className="text-lg font-serif font-bold text-emerald-700">
                    {selectedStudentSubs.length ? Math.round((acCount / selectedStudentSubs.length) * 100) : 0}%
                  </p>
                  <p className="text-xs text-[var(--ws-muted)] mt-0.5">Tỷ lệ AC</p>
                </div>
              </div>

              {/* Badge */}
              <div className="mb-6">
                <span className={`text-xs px-3 py-1.5 rounded-full border font-medium ${getRatingBadge(selectedStudentData.rating).color}`}>
                  {getRatingBadge(selectedStudentData.rating).label}
                </span>
              </div>

              {/* Contact */}
              <div className="mb-6 p-4 bg-[var(--ws-panel2)] rounded-xl border border-[var(--ws-border)] shadow-xs leading-relaxed">
                <p className="text-sm text-[var(--ws-muted)] font-medium">Email: <span className="text-[var(--ws-text)]">{selectedStudentData.email}</span></p>
                <p className="text-sm text-[var(--ws-muted)] font-medium mt-1.5">Hoạt động gần nhất: <span className="text-[var(--ws-text)]">{selectedStudentData.lastActive}</span></p>
              </div>

              {/* Recent Submissions */}
              <h4 className="text-sm font-bold font-serif text-[var(--ws-text)] mb-3">Bài nộp gần đây</h4>
              <div className="space-y-2">
                {selectedStudentSubs.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-3 bg-[var(--ws-panel2)] rounded-lg border border-[var(--ws-border)]">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-md font-bold border ${verdictColors[sub.verdict]}`}>
                        {sub.verdict}
                      </span>
                      <div>
                        <p className="text-sm text-[var(--ws-text)] font-semibold">{sub.problemTitle}</p>
                        <p className="text-xs text-[var(--ws-muted)] mt-0.5">{sub.language} • {sub.executionTime}ms</p>
                      </div>
                    </div>
                    <span className="text-xs text-[var(--ws-muted)]">{sub.timestamp.slice(5, 16)}</span>
                  </div>
                ))}
                {selectedStudentSubs.length === 0 && (
                  <p className="text-sm text-[var(--ws-muted)] text-center py-4">Chưa có bài nộp</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Students Table */}
      <div className="bg-white border border-[#e5dac9] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e5dac9] bg-[#f0ebd9]/50">
                <th className="text-left text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">#</th>
                <th className="text-left text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">Sinh viên</th>
                <th className="text-left text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">Lớp</th>
                <th className="text-right text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">Bài đã giải</th>
                <th className="text-right text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">Lượt nộp</th>
                <th className="text-right text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">Rating</th>
                <th className="text-center text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, index) => {
                const badge = getRatingBadge(student.rating);
                return (
                  <tr key={student.id} className="border-b border-[#e5dac9]/50 hover:bg-[#f7f4eb]/50 transition-colors">
                    <td className="py-3 px-4 text-sm text-[#8a8073]">{index + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#193a2b] to-[#2d5a3f] rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {student.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm text-[#191919] font-semibold">{student.fullName}</p>
                          <p className="text-xs text-[#8a8073]">@{student.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-[#5c5446] font-medium">{student.className}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                      {student.solvedCount}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-[#5c5446]">
                      {student.submissionCount}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-sm font-bold ${getRatingColor(student.rating)}`}>{student.rating}</span>
                      <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full border ${badge.color}`}>{badge.label}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedStudent(student.id)}
                        className="p-1.5 bg-white border border-[#e5dac9] rounded-lg text-[#5c5446] hover:text-[#193a2b] hover:bg-[#f7f4eb] transition-colors shadow-xs"
                        title="Xem chi tiết"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredStudents.length === 0 && (
          <div className="p-12 text-center">
            <Users size={48} className="text-[#bfae99] mx-auto mb-4" />
            <p className="text-[#8a8073]">Không tìm thấy sinh viên nào</p>
          </div>
        )}
      </div>
    </div>
  );
}
