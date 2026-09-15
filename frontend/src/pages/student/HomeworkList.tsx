import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useHomeworksQuery } from '../../api/homeworks';
import { useClass } from '../../context/ClassContext';
import { formatVNFull } from '../../utils/dateTime';
import {
  BookOpen,
  Clock,
  ChevronRight,
  Lock,
  GraduationCap,
  Search,
} from 'lucide-react';


function deadlineInfo(deadline: string) {
  const now = Date.now();
  const end = new Date(deadline).getTime();
  const diff = end - now;
  const days = Math.ceil(diff / 86_400_000);
  if (diff < 0) return { label: 'Đã đóng', chipClass: 'bg-[#f0ebd9] text-[#8a8073] border-[#e5dac9]', closed: true, daysLeft: -1 };
  if (days <= 1) return { label: 'Còn < 1 ngày', chipClass: 'bg-red-50 text-red-700 border-red-200', closed: false, daysLeft: days };
  if (days <= 3) return { label: `Còn ${days} ngày`, chipClass: 'bg-yellow-50 text-yellow-700 border-yellow-200', closed: false, daysLeft: days };
  return { label: `Còn ${days} ngày`, chipClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', closed: false, daysLeft: days };
}


type SortKey = 'deadline_asc' | 'deadline_desc' | 'name_az' | 'name_za';
type StatusFilter = 'all' | 'open' | 'closed';

export default function HomeworkList() {
  const { data: allHomeworks = [], isLoading } = useHomeworksQuery();
  const { enrolledClasses } = useClass();

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('deadline_asc');

  // Chỉ hiển thị homework của các lớp đã tham gia
  const enrolledIds = useMemo(() => new Set(enrolledClasses.map((c) => c.id)), [enrolledClasses]);

  const filtered = useMemo(() => {
    let list = allHomeworks.filter((hw) => enrolledIds.has(hw.class_id));

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (hw) =>
          hw.title.toLowerCase().includes(q) ||
          (hw.class?.name ?? '').toLowerCase().includes(q)
      );
    }

    // Class filter
    if (classFilter !== 'all') {
      list = list.filter((hw) => hw.class_id === classFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter((hw) => {
        const closed = new Date(hw.deadline).getTime() < Date.now();
        return statusFilter === 'open' ? !closed : closed;
      });
    }

    // Sort
    list = [...list].sort((a, b) => {
      if (sort === 'deadline_asc') return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (sort === 'deadline_desc') return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
      if (sort === 'name_az') return a.title.localeCompare(b.title, 'vi');
      if (sort === 'name_za') return b.title.localeCompare(a.title, 'vi');
      return 0;
    });

    return list;
  }, [allHomeworks, enrolledIds, search, classFilter, statusFilter, sort]);

  const openCount = allHomeworks.filter(
    (hw) => enrolledIds.has(hw.class_id) && new Date(hw.deadline).getTime() > Date.now()
  ).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#193a2b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#191919]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold font-serif text-[#191919]">Bài tập của tôi</h2>
          <p className="text-sm text-[#8a8073] mt-1">
            Tất cả bài tập từ {enrolledClasses.length} lớp bạn tham gia
            {openCount > 0 && (
              <span className="ml-2 text-emerald-700 font-medium">• {openCount} đang mở</span>
            )}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Tổng bài tập', value: allHomeworks.filter((h) => enrolledIds.has(h.class_id)).length, icon: <BookOpen size={18} /> },
          { label: 'Đang mở', value: openCount, icon: <Clock size={18} /> },
          { label: 'Lớp học', value: enrolledClasses.length, icon: <GraduationCap size={18} /> },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#e5dac9] rounded-xl p-4 text-center shadow-sm">
            <div className="text-[#193a2b] flex justify-center mb-2">{s.icon}</div>
            <p className="text-2xl font-bold font-serif">{s.value}</p>
            <p className="text-xs text-[#8a8073] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8073]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm bài tập hoặc lớp..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#e5dac9] rounded-xl text-sm text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
          />
        </div>

        {/* Class dropdown */}
        {enrolledClasses.length > 1 && (
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2.5 bg-white border border-[#e5dac9] rounded-xl text-sm text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
          >
            <option value="all">Tất cả lớp</option>
            {enrolledClasses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        {/* Status */}
        <div className="flex gap-1 bg-white border border-[#e5dac9] rounded-xl p-1">
          {(['all', 'open', 'closed'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-[#193a2b] text-white' : 'text-[#5c5446] hover:bg-[#f0ebd9]'
              }`}
            >
              {s === 'all' ? 'Tất cả' : s === 'open' ? 'Đang mở' : 'Đã đóng'}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="px-3 py-2.5 bg-white border border-[#e5dac9] rounded-xl text-sm text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
        >
          <option value="deadline_asc">Deadline sớm nhất</option>
          <option value="deadline_desc">Deadline trễ nhất</option>
          <option value="name_az">Tên A → Z</option>
          <option value="name_za">Tên Z → A</option>
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#e5dac9] rounded-2xl p-14 text-center shadow-sm">
          <BookOpen size={48} className="text-[#bfae99] mx-auto mb-4" />
          <p className="font-semibold text-[#191919]">
            {allHomeworks.filter((h) => enrolledIds.has(h.class_id)).length === 0
              ? 'Chưa có bài tập nào'
              : 'Không tìm thấy bài tập phù hợp'}
          </p>
          <p className="text-sm text-[#8a8073] mt-1">
            {enrolledClasses.length === 0
              ? 'Hãy tham gia lớp học để nhận bài tập.'
              : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((hw) => {
            const dl = deadlineInfo(hw.deadline);
            const tasks = Array.isArray(hw.tasks) ? hw.tasks as Array<{ problem_id?: string; points?: number }> : [];

            return (
              <Link
                key={hw.id}
                to={`/student/class/${hw.class_id}/homework/${hw.id}`}
                className="flex items-center gap-4 bg-white border border-[#e5dac9] rounded-2xl px-5 py-4 hover:shadow-md hover:border-[#193a2b]/30 transition-all shadow-sm group"
              >
                {/* Left accent */}
                <div className={`w-1 h-10 rounded-full flex-shrink-0 ${dl.closed ? 'bg-[#e5dac9]' : 'bg-[#193a2b]'}`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-bold text-[#191919] group-hover:text-[#193a2b] transition-colors truncate">
                      {hw.title}
                    </p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 ${dl.chipClass}`}>
                      {dl.closed && <Lock size={9} className="inline mr-0.5" />}{dl.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#8a8073] flex-wrap">
                    <span className="flex items-center gap-1">
                      <GraduationCap size={11} /> {hw.class?.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen size={11} /> {tasks.length} bài toán
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {formatVNFull(hw.deadline)}
                    </span>
                  </div>
                </div>

                <ChevronRight size={16} className="text-[#bfae99] group-hover:text-[#193a2b] flex-shrink-0 transition-colors" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
