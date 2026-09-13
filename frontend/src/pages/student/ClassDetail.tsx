import { useParams, Link, useNavigate } from 'react-router-dom';
import { useClassHomeworksQuery } from '../../api/homeworks';
import { useClassesQuery } from '../../api/classes';
import { useMemo } from 'react';
import {
  GraduationCap,
  Clock,
  BookOpen,
  ChevronRight,
  ArrowLeft,
  Users,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from 'lucide-react';

function deadlineInfo(deadline: string) {
  const now = Date.now();
  const end = new Date(deadline).getTime();
  const diff = end - now;
  const days = Math.ceil(diff / 86_400_000);
  if (diff < 0) return { label: 'Đã đóng', color: 'text-[#8a8073]', chipClass: 'bg-[#f0ebd9] text-[#8a8073] border-[#e5dac9]', closed: true };
  if (days <= 1) return { label: 'Còn < 1 ngày', color: 'text-red-600', chipClass: 'bg-red-50 text-red-700 border-red-200', closed: false };
  if (days <= 3) return { label: `Còn ${days} ngày`, color: 'text-yellow-700', chipClass: 'bg-yellow-50 text-yellow-800 border-yellow-200', closed: false };
  return { label: `Còn ${days} ngày`, color: 'text-emerald-700', chipClass: 'bg-emerald-50 text-emerald-800 border-emerald-200', closed: false };
}

function formatDate(s: string) {
  return new Date(s).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function StudentClassDetail() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();

  const { data: apiClasses = [], isLoading: classLoading } = useClassesQuery();
  const { data: homeworks = [], isLoading: hwLoading } = useClassHomeworksQuery(classId);

  const classInfo = useMemo(
    () => apiClasses.find((c) => c.id === classId),
    [apiClasses, classId]
  );

  const activeCount = homeworks.filter((hw) => {
    const d = deadlineInfo(hw.deadline);
    return !d.closed;
  }).length;

  const isLoading = classLoading || hwLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#193a2b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="text-center py-20">
        <GraduationCap size={48} className="text-[#bfae99] mx-auto mb-4" />
        <p className="font-semibold text-[#191919]">Không tìm thấy lớp học</p>
        <button onClick={() => navigate('/student/class')} className="mt-4 text-sm text-[#193a2b] hover:underline">
          ← Quay lại Lớp học
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#191919]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#8a8073]">
        <button onClick={() => navigate('/student/class')} className="hover:text-[#193a2b] transition-colors flex items-center gap-1">
          <ArrowLeft size={14} /> Lớp học
        </button>
        <ChevronRight size={14} />
        <span className="text-[#191919] font-medium truncate">{classInfo.name}</span>
      </div>

      {/* Class header */}
      <div className="bg-gradient-to-br from-[#193a2b] to-[#2a5540] rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap size={20} className="flex-shrink-0 opacity-80" />
              <span className="text-sm opacity-75">{classInfo.semester}</span>
            </div>
            <h1 className="text-2xl font-bold font-serif mb-1">{classInfo.name}</h1>
            {classInfo.description && (
              <p className="text-sm opacity-80 line-clamp-2 mt-1">{classInfo.description}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs opacity-60 mb-1">Mã lớp</p>
            <p className="text-lg font-mono font-bold tracking-widest">{classInfo.invite_code}</p>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-5 pt-4 border-t border-white/20 text-sm">
          <span className="flex items-center gap-1.5 opacity-80">
            <Users size={14} /> {classInfo.students?.length ?? 0} sinh viên
          </span>
          <span className="flex items-center gap-1.5 opacity-80">
            <BookOpen size={14} /> {homeworks.length} bài tập
          </span>
          <span className="flex items-center gap-1.5 opacity-80">
            <CheckCircle2 size={14} /> {activeCount} đang mở
          </span>
        </div>
      </div>

      {/* Homework list */}
      <div>
        <h2 className="text-lg font-bold font-serif text-[#191919] mb-4">Danh sách bài tập</h2>

        {homeworks.length === 0 ? (
          <div className="bg-white border border-[#e5dac9] rounded-2xl p-14 text-center shadow-sm">
            <BookOpen size={48} className="text-[#bfae99] mx-auto mb-4" />
            <p className="font-semibold text-[#191919]">Chưa có bài tập nào</p>
            <p className="text-sm text-[#8a8073] mt-1">Giảng viên chưa giao bài tập cho lớp này.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {homeworks.map((hw) => {
              const dl = deadlineInfo(hw.deadline);
              const taskCount = Array.isArray(hw.tasks) ? hw.tasks.length : 0;
              const solvable = (hw.tasks as Array<{ problem_id?: string }>).filter((t) => !!t.problem_id).length;

              return (
                <Link
                  key={hw.id}
                  to={`/student/class/${classId}/homework/${hw.id}`}
                  className="block bg-white border border-[#e5dac9] rounded-2xl p-5 hover:shadow-md hover:border-[#193a2b]/30 transition-all shadow-sm group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-[#191919] group-hover:text-[#193a2b] transition-colors">
                          {hw.title}
                        </h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 ${dl.chipClass}`}>
                          {dl.closed ? <Lock size={10} className="inline mr-1" /> : null}
                          {dl.label}
                        </span>
                      </div>
                      {hw.description && (
                        <p className="text-sm text-[#5c5446] line-clamp-2 mb-3">{hw.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-[#8a8073]">
                        <span className="flex items-center gap-1">
                          <BookOpen size={12} /> {taskCount} bài toán
                        </span>
                        {solvable < taskCount && (
                          <span className="flex items-center gap-1 text-yellow-700">
                            <AlertTriangle size={12} /> {solvable}/{taskCount} có thể làm
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {formatDate(hw.deadline)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-[#bfae99] group-hover:text-[#193a2b] flex-shrink-0 mt-1 transition-colors" />
                  </div>

                  {/* Deadline progress bar */}
                  {!dl.closed && (() => {
                    const start = new Date(hw.deadline).getTime() - 14 * 86_400_000;
                    const end = new Date(hw.deadline).getTime();
                    const now = Date.now();
                    const pct = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
                    return (
                      <div className="mt-3 pt-3 border-t border-[#f0ebd9]">
                        <div className="w-full h-1.5 bg-[#f0ebd9] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-yellow-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
