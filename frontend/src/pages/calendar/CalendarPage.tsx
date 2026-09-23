import { useMemo } from 'react';
import { Calendar as CalendarIcon, Loader2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useContestsQuery } from '../../api/contests';
import { useHomeworksQuery } from '../../api/homeworks';
import { useClass } from '../../context/ClassContext';
import CalendarView from '../../components/calendar/CalendarView';
import { CalendarEvent } from '../../components/calendar/EventDetailModal';
import { getVNParts } from '../../utils/dateTime';

interface Props {
  userRole?: 'student' | 'instructor';
}

export default function CalendarPage({ userRole = 'student' }: Props) {
  const { data: contests = [], isLoading: contestsLoading } = useContestsQuery();
  const { data: rawHomeworks = [], isLoading: hwLoading } = useHomeworksQuery();
  const { myClasses, enrolledClasses } = useClass();

  const classesList = useMemo(() => {
    if (userRole === 'instructor') {
      return myClasses.map((c) => ({ id: c.id, name: c.name }));
    }
    return enrolledClasses.map((c) => ({ id: c.id, name: c.name }));
  }, [userRole, myClasses, enrolledClasses]);

  // Aggregate all events into CalendarEvent[]
  const allEvents = useMemo(() => {
    const list: CalendarEvent[] = [];

    // 1. Contests
    for (const c of contests) {
      if (!c.startTime) continue;
      const p = getVNParts(c.startTime);
      if (!p) continue;

      list.push({
        id: `contest-${c.id}`,
        title: c.title,
        type: 'contest',
        dateStr: p.dateString,
        timeStr: p.timeString,
        startDateTime: c.startTime,
        endDateTime: c.endTime,
        className: c.className || (c.classId ? 'Lớp học riêng' : 'Toàn trường'),
        classId: c.classId,
        status: c.status,
        description: c.description,
        link: userRole === 'instructor' ? `/instructor/contest` : `/student/contest`,
      });
    }

    // 2. Homeworks
    for (const hw of rawHomeworks) {
      if (!hw.deadline) continue;
      const p = getVNParts(hw.deadline);
      if (!p) continue;

      const clsName = hw.class?.name || 'Lớp học';

      list.push({
        id: `hw-${hw.id}`,
        title: hw.title,
        type: 'homework',
        dateStr: p.dateString,
        timeStr: p.timeString,
        startDateTime: hw.deadline,
        className: clsName,
        classId: hw.class_id,
        status: 'active',
        description: hw.description ?? '',
        link:
          userRole === 'instructor'
            ? `/instructor/class/${hw.class_id}`
            : `/student/class/${hw.class_id}/homework/${hw.id}`,
      });
    }

    return list;
  }, [contests, rawHomeworks, userRole]);

  const isLoading = contestsLoading || hwLoading;

  return (
    <div className="space-y-2.5 text-[var(--ws-text)] max-w-[1040px] mx-auto px-2">
      {/* Top Banner (Clean & Compact) */}
      <div className="bg-[var(--ws-panel)] border border-[var(--ws-border)] rounded-xl p-2.5 px-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[var(--ws-accent)]/15 text-[var(--ws-accent)] flex items-center justify-center font-bold flex-shrink-0">
            <CalendarIcon size={14} />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold font-serif text-[var(--ws-text)] leading-tight flex items-center gap-2">
              Lịch biểu học thuật
              <span className="text-[11px] font-normal text-[var(--ws-muted)] hidden md:inline">
                • Đồng bộ hạn chót bài tập & lịch thi (UTC+7)
              </span>
            </h1>
          </div>
        </div>

        {userRole === 'instructor' && (
          <div className="flex items-center gap-2">
            <Link
              to="/instructor/classes"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--ws-accent)] text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-2xs"
            >
              <Plus size={13} /> Giao bài tập
            </Link>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="bg-[var(--ws-panel)] border border-[var(--ws-border)] rounded-xl p-12 text-center shadow-2xs">
          <Loader2 size={28} className="animate-spin text-[var(--ws-accent)] mx-auto mb-2" />
          <p className="text-xs text-[var(--ws-muted)]">Đang đồng bộ dữ liệu lịch biểu...</p>
        </div>
      ) : (
        <CalendarView
          events={allEvents}
          userRole={userRole}
          classes={classesList}
        />
      )}
    </div>
  );
}
