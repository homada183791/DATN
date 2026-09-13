import { useParams, Link, useNavigate } from 'react-router-dom';
import { useClassHomeworkQuery } from '../../api/homeworks';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Clock,
  Play,
  Lock,
  AlertTriangle,
  Trophy,
} from 'lucide-react';

const diffChip: Record<string, string> = {
  Easy: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Hard: 'bg-red-100 text-red-800 border-red-200',
};
const diffLabel: Record<string, string> = { Easy: 'Dễ', Medium: 'Trung bình', Hard: 'Khó' };

function deadlineInfo(deadline: string) {
  const now = Date.now();
  const end = new Date(deadline).getTime();
  const diff = end - now;
  const days = Math.ceil(diff / 86_400_000);
  if (diff < 0) return { label: 'Đã đóng', chipClass: 'bg-[#f0ebd9] text-[#8a8073] border-[#e5dac9]', closed: true };
  if (days <= 1) return { label: 'Còn < 1 ngày', chipClass: 'bg-red-50 text-red-700 border-red-200', closed: false };
  if (days <= 3) return { label: `Còn ${days} ngày`, chipClass: 'bg-yellow-50 text-yellow-800 border-yellow-200', closed: false };
  return { label: `Còn ${days} ngày`, chipClass: 'bg-emerald-50 text-emerald-800 border-emerald-200', closed: false };
}

function formatDate(s: string) {
  return new Date(s).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function HomeworkDetail() {
  const { classId, homeworkId } = useParams<{ classId: string; homeworkId: string }>();
  const navigate = useNavigate();

  const { data: homework, isLoading, isError } = useClassHomeworkQuery(classId, homeworkId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#193a2b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !homework) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size={48} className="text-[#bfae99] mx-auto mb-4" />
        <p className="font-semibold text-[#191919]">Không tìm thấy bài tập</p>
        <button onClick={() => navigate(`/student/class/${classId}`)} className="mt-4 text-sm text-[#193a2b] hover:underline">
          ← Quay lại lớp học
        </button>
      </div>
    );
  }

  const tasks = Array.isArray(homework.tasks) ? homework.tasks as Array<{
    id: string;
    title: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    points: number;
    statement: string;
    problem_id?: string;
  }> : [];

  const dl = deadlineInfo(homework.deadline);
  const totalPoints = tasks.reduce((s, t) => s + (t.points ?? 0), 0);
  const solvableCount = tasks.filter((t) => !!t.problem_id).length;

  return (
    <div className="space-y-6 text-[#191919]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#8a8073] flex-wrap">
        <button onClick={() => navigate('/student/class')} className="hover:text-[#193a2b] transition-colors">
          Lớp học
        </button>
        <ChevronRight size={14} />
        <button onClick={() => navigate(`/student/class/${classId}`)} className="hover:text-[#193a2b] transition-colors truncate max-w-[120px]">
          {homework.class?.name ?? 'Lớp học'}
        </button>
        <ChevronRight size={14} />
        <span className="text-[#191919] font-medium truncate max-w-[200px]">{homework.title}</span>
      </div>

      {/* Homework header */}
      <div className="bg-white border border-[#e5dac9] rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold ${dl.chipClass}`}>
                {dl.closed ? <Lock size={10} className="inline mr-1" /> : null}{dl.label}
              </span>
              <span className="text-xs text-[#8a8073] bg-[#f0ebd9] px-2 py-0.5 rounded-full border border-[#e5dac9]">
                {homework.class?.name}
              </span>
            </div>
            <h1 className="text-2xl font-bold font-serif text-[#191919]">{homework.title}</h1>
            {homework.description && (
              <p className="text-sm text-[#5c5446] mt-2 leading-relaxed">{homework.description}</p>
            )}
          </div>
          <button
            onClick={() => navigate(`/student/class/${classId}`)}
            className="flex items-center gap-1.5 text-sm text-[#8a8073] hover:text-[#193a2b] transition-colors flex-shrink-0"
          >
            <ArrowLeft size={14} /> Quay lại
          </button>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-6 text-sm text-[#8a8073] pt-4 border-t border-[#f0ebd9]">
          <span className="flex items-center gap-1.5">
            <BookOpen size={14} /> {tasks.length} bài toán
          </span>
          <span className="flex items-center gap-1.5">
            <Trophy size={14} /> {totalPoints} điểm
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} /> Hạn: {formatDate(homework.deadline)}
          </span>
        </div>
      </div>

      {/* Problem list */}
      <div>
        <h2 className="text-base font-bold text-[#191919] mb-3">
          Danh sách bài toán
          {solvableCount < tasks.length && (
            <span className="ml-2 text-xs font-normal text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
              {tasks.length - solvableCount} bài chưa có link
            </span>
          )}
        </h2>

        {tasks.length === 0 ? (
          <div className="bg-white border border-[#e5dac9] rounded-2xl p-14 text-center shadow-sm">
            <BookOpen size={48} className="text-[#bfae99] mx-auto mb-4" />
            <p className="font-semibold text-[#191919]">Chưa có bài toán nào</p>
          </div>
        ) : (
          <div className="bg-white border border-[#e5dac9] rounded-2xl overflow-hidden shadow-sm divide-y divide-[#f0ebd9]">
            {tasks.map((task, i) => {
              const canSolve = !!task.problem_id;
              const solveUrl = `/student/class/${classId}/homework/${homeworkId}/problem/${task.problem_id}`;

              return (
                <div
                  key={task.id}
                  className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                    canSolve ? 'hover:bg-[#f7f4eb]' : 'opacity-70'
                  }`}
                >
                  {/* Index */}
                  <span className="text-sm font-mono text-[#8a8073] w-6 flex-shrink-0 text-center">
                    {String.fromCharCode(65 + i)}
                  </span>

                  {/* Title + description */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${canSolve ? 'text-[#191919]' : 'text-[#5c5446]'}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-[#8a8073] truncate mt-0.5">
                      {task.statement?.slice(0, 80) ?? ''}...
                    </p>
                  </div>

                  {/* Difficulty */}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 ${diffChip[task.difficulty] ?? diffChip.Easy}`}>
                    {diffLabel[task.difficulty] ?? 'Dễ'}
                  </span>

                  {/* Points */}
                  <span className="text-xs text-[#8a8073] w-12 text-right flex-shrink-0 font-mono">
                    {task.points}đ
                  </span>

                  {/* Action */}
                  {canSolve ? (
                    <Link
                      to={solveUrl}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#193a2b] text-white text-xs font-semibold rounded-xl hover:bg-[#143022] transition-colors flex-shrink-0 shadow-sm"
                    >
                      <Play size={11} fill="white" /> Làm bài
                    </Link>
                  ) : (
                    <span className="flex items-center gap-1 px-3.5 py-1.5 bg-[#f0ebd9] text-[#8a8073] text-xs rounded-xl flex-shrink-0 cursor-not-allowed">
                      <Lock size={11} /> Chưa có link
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
