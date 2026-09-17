import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  BookOpen,
  Trophy,
  Filter,
  Download,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { CalendarEvent } from './EventDetailModal';
import EventDetailModal from './EventDetailModal';
import { getVNParts, formatVN } from '../../utils/dateTime';

interface Props {
  events: CalendarEvent[];
  userRole?: 'student' | 'instructor';
  classes?: Array<{ id: string; name: string }>;
}

type ViewMode = 'month' | 'week' | 'agenda';

const DAYS_OF_WEEK = [
  { key: 0, labelEn: 'SUN', labelVi: 'CN' },
  { key: 1, labelEn: 'MON', labelVi: 'T2' },
  { key: 2, labelEn: 'TUE', labelVi: 'T3' },
  { key: 3, labelEn: 'WED', labelVi: 'T4' },
  { key: 4, labelEn: 'THU', labelVi: 'T5' },
  { key: 5, labelEn: 'FRI', labelVi: 'T6' },
  { key: 6, labelEn: 'SAT', labelVi: 'T7' },
];

export default function CalendarView({ events, userRole = 'student', classes = [] }: Props) {
  // Current active date context (UTC+7)
  const todayVN = useMemo(() => {
    const p = getVNParts(new Date())!;
    return {
      year: p.year,
      month: p.month, // 1-12
      day: p.day,
      dateString: p.dateString,
    };
  }, []);

  const [currentYear, setCurrentYear] = useState<number>(todayVN.year);
  const [currentMonth, setCurrentMonth] = useState<number>(todayVN.month); // 1-12
  const [selectedDate, setSelectedDate] = useState<string>(todayVN.dateString);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [typeFilter, setTypeFilter] = useState<'all' | 'homework' | 'contest'>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [activeModalEvent, setActiveModalEvent] = useState<CalendarEvent | null>(null);

  // Navigation handlers
  const goToToday = () => {
    setCurrentYear(todayVN.year);
    setCurrentMonth(todayVN.month);
    setSelectedDate(todayVN.dateString);
  };

  const goToPrev = () => {
    if (viewMode === 'month') {
      if (currentMonth === 1) {
        setCurrentMonth(12);
        setCurrentYear((y) => y - 1);
      } else {
        setCurrentMonth((m) => m - 1);
      }
    } else if (viewMode === 'week') {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - 7);
      const p = getVNParts(d)!;
      setSelectedDate(p.dateString);
      setCurrentMonth(p.month);
      setCurrentYear(p.year);
    }
  };

  const goToNext = () => {
    if (viewMode === 'month') {
      if (currentMonth === 12) {
        setCurrentMonth(1);
        setCurrentYear((y) => y + 1);
      } else {
        setCurrentMonth((m) => m + 1);
      }
    } else if (viewMode === 'week') {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + 7);
      const p = getVNParts(d)!;
      setSelectedDate(p.dateString);
      setCurrentMonth(p.month);
      setCurrentYear(p.year);
    }
  };

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (typeFilter !== 'all' && ev.type !== typeFilter) return false;
      if (classFilter !== 'all' && ev.classId !== classFilter) return false;
      return true;
    });
  }, [events, typeFilter, classFilter]);

  // Events indexed by dateStr (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of filteredEvents) {
      if (!map[ev.dateStr]) map[ev.dateStr] = [];
      map[ev.dateStr].push(ev);
    }
    // Sắp xếp sự kiện theo giờ
    for (const key in map) {
      map[key].sort((a, b) => a.timeStr.localeCompare(b.timeStr));
    }
    return map;
  }, [filteredEvents]);

  // Generate 35 or 42 grid cells for Month View (Sunday first)
  const monthGridDays = useMemo(() => {
    // Ngày 1 của tháng hiện tại
    const firstDay = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0));
    const firstDayOfWeek = firstDay.getUTCDay(); // 0 (Sun) -> 6 (Sat)

    // Tổng số ngày trong tháng hiện tại
    const daysInCurrentMonth = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();

    // Số ngày của tháng trước
    const daysInPrevMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 0)).getUTCDate();

    const cells: Array<{
      year: number;
      month: number; // 1-12
      day: number;
      dateString: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isFirstOfMonth: boolean;
    }> = [];

    // 1. Ngày từ tháng trước bù vào
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const dateString = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        year: prevYear,
        month: prevMonth,
        day,
        dateString,
        isCurrentMonth: false,
        isToday: dateString === todayVN.dateString,
        isFirstOfMonth: day === 1,
      });
    }

    // 2. Các ngày trong tháng hiện tại
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const dateString = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        year: currentYear,
        month: currentMonth,
        day,
        dateString,
        isCurrentMonth: true,
        isToday: dateString === todayVN.dateString,
        isFirstOfMonth: day === 1,
      });
    }

    // 3. Ngày từ tháng sau bù vào để đủ 35 hoặc 42 ô
    const totalCells = cells.length > 35 ? 42 : 35;
    const remaining = totalCells - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      const dateString = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        year: nextYear,
        month: nextMonth,
        day,
        dateString,
        isCurrentMonth: false,
        isToday: dateString === todayVN.dateString,
        isFirstOfMonth: day === 1,
      });
    }

    return cells;
  }, [currentYear, currentMonth, todayVN.dateString]);

  // Days for Week View
  const weekDays = useMemo(() => {
    const curr = new Date(selectedDate);
    const dayOfWeek = curr.getDay(); // 0 = Sun
    const sunday = new Date(curr);
    sunday.setDate(curr.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const p = getVNParts(d)!;
      days.push({
        dateString: p.dateString,
        dayNumber: p.day,
        monthNumber: p.month,
        dayName: DAYS_OF_WEEK[i].labelEn,
        dayNameVi: DAYS_OF_WEEK[i].labelVi,
        isToday: p.dateString === todayVN.dateString,
      });
    }
    return days;
  }, [selectedDate, todayVN.dateString]);

  // Tải file .ics cho tất cả sự kiện
  const downloadICS = () => {
    let icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//JudgeHub//Academic Calendar//VI\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\nX-WR-TIMEZONE:Asia/Ho_Chi_Minh\n`;

    for (const ev of filteredEvents) {
      const start = new Date(ev.startDateTime).toISOString().replace(/-|:|\.\d+/g, '');
      const end = ev.endDateTime
        ? new Date(ev.endDateTime).toISOString().replace(/-|:|\.\d+/g, '')
        : start;

      icsContent += `BEGIN:VEVENT\nUID:${ev.id}@judgehub.edu.vn\nDTSTAMP:${start}\nDTSTART:${start}\nDTEND:${end}\nSUMMARY:${ev.title}\nDESCRIPTION:${ev.description || ''}\nLOCATION:JudgeHub Online Judge\nSTATUS:CONFIRMED\nEND:VEVENT\n`;
    }

    icsContent += `END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `judgehub_calendar_${currentYear}_${currentMonth}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-2.5">
      {/* Calendar Header Card (Compact ~3/5) */}
      <div className="bg-[var(--ws-panel)] border border-[var(--ws-border)] rounded-xl p-2.5 px-3.5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Left: Today + Arrows + Month/Year */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={goToToday}
              className="px-2.5 py-1 rounded-lg border border-[var(--ws-border)] text-[11.5px] font-semibold text-[var(--ws-text)] hover:bg-[var(--ws-hover)] transition-colors"
            >
              Hôm nay
            </button>

            <div className="flex items-center gap-0.5">
              <button
                onClick={goToPrev}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--ws-border)] text-[var(--ws-muted)] hover:text-[var(--ws-text)] hover:bg-[var(--ws-hover)] transition-colors"
                title="Trước"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={goToNext}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--ws-border)] text-[var(--ws-muted)] hover:text-[var(--ws-text)] hover:bg-[var(--ws-hover)] transition-colors"
                title="Tiếp theo"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="flex items-center gap-1.5 ml-1">
              <h2 className="text-base md:text-lg font-bold font-serif text-[var(--ws-text)] tracking-tight">
                {monthNamesEn[currentMonth - 1]} {currentYear}
              </h2>
              <span className="text-[11px] text-[var(--ws-muted)] hidden sm:inline">
                (Tháng {currentMonth}, {currentYear})
              </span>
            </div>
          </div>

          {/* Right: Filters & View Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Type Pills */}
            <div className="flex items-center p-0.5 rounded-lg bg-[var(--ws-panel2)] border border-[var(--ws-border)]">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                  typeFilter === 'all'
                    ? 'bg-[var(--ws-accent)] text-white shadow-2xs'
                    : 'text-[var(--ws-muted)] hover:text-[var(--ws-text)]'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setTypeFilter('homework')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 ${
                  typeFilter === 'homework'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-[var(--ws-muted)] hover:text-[var(--ws-text)]'
                }`}
              >
                <BookOpen size={11} /> Bài tập
              </button>
              <button
                onClick={() => setTypeFilter('contest')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 ${
                  typeFilter === 'contest'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-[var(--ws-muted)] hover:text-[var(--ws-text)]'
                }`}
              >
                <Trophy size={11} /> Kỳ thi
              </button>
            </div>

            {/* Class Filter if available */}
            {classes.length > 0 && (
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-2 py-1 rounded-lg bg-[var(--ws-panel2)] border border-[var(--ws-border)] text-[11px] font-semibold text-[var(--ws-text)] outline-hidden focus:border-[var(--ws-accent)]"
              >
                <option value="all">Tất cả lớp học</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            {/* View Mode Switcher */}
            <div className="flex items-center p-0.5 rounded-lg bg-[var(--ws-panel2)] border border-[var(--ws-border)]">
              <button
                onClick={() => setViewMode('month')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                  viewMode === 'month'
                    ? 'bg-[var(--ws-panel)] text-[var(--ws-text)] border border-[var(--ws-border)] shadow-2xs'
                    : 'text-[var(--ws-muted)] hover:text-[var(--ws-text)]'
                }`}
              >
                Tháng
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                  viewMode === 'week'
                    ? 'bg-[var(--ws-panel)] text-[var(--ws-text)] border border-[var(--ws-border)] shadow-2xs'
                    : 'text-[var(--ws-muted)] hover:text-[var(--ws-text)]'
                }`}
              >
                Tuần
              </button>
              <button
                onClick={() => setViewMode('agenda')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                  viewMode === 'agenda'
                    ? 'bg-[var(--ws-panel)] text-[var(--ws-text)] border border-[var(--ws-border)] shadow-2xs'
                    : 'text-[var(--ws-muted)] hover:text-[var(--ws-text)]'
                }`}
              >
                Lịch trình
              </button>
            </div>

            {/* Export .ics */}
            <button
              onClick={downloadICS}
              className="p-1.5 rounded-lg border border-[var(--ws-border)] text-[var(--ws-muted)] hover:text-[var(--ws-text)] hover:bg-[var(--ws-hover)] transition-colors"
              title="Xuất file iCalendar (.ics)"
            >
              <Download size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar Body */}
      {viewMode === 'month' && (
        <div className="bg-[var(--ws-panel)] border border-[var(--ws-border)] rounded-xl shadow-2xs overflow-hidden">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 border-b border-[var(--ws-border)] bg-[var(--ws-panel2)]/50 text-center text-[11px] font-bold text-[var(--ws-muted)] py-1.5">
            {DAYS_OF_WEEK.map((d) => (
              <div key={d.key} className="tracking-wider">
                <span className="hidden sm:inline">{d.labelEn}</span>
                <span className="sm:hidden">{d.labelVi}</span>
              </div>
            ))}
          </div>

          {/* Month Day Grid (7 cols x 5/6 rows, compact ~3/5 size) */}
          <div className="grid grid-cols-7 divide-x divide-y divide-[var(--ws-border)]">
            {monthGridDays.map((cell) => {
              const dayEvents = eventsByDate[cell.dateString] || [];
              const hasEvents = dayEvents.length > 0;

              return (
                <div
                  key={cell.dateString}
                  onClick={() => setSelectedDate(cell.dateString)}
                  className={`min-h-[60px] md:min-h-[68px] p-1 transition-colors flex flex-col justify-start cursor-pointer ${
                    cell.isCurrentMonth
                      ? 'bg-[var(--ws-panel)] hover:bg-[var(--ws-panel2)]/40'
                      : 'bg-[var(--ws-panel2)]/30 opacity-40'
                  }`}
                >
                  {/* Date Header inside cell */}
                  <div className="flex items-center justify-between leading-none mb-0.5">
                    {cell.isToday ? (
                      <div className="w-5 h-5 rounded-full bg-[var(--ws-accent)] text-white font-bold text-[10.5px] flex items-center justify-center shadow-2xs">
                        {cell.day}
                      </div>
                    ) : cell.isFirstOfMonth ? (
                      <span className="text-[10.5px] font-bold text-[var(--ws-text)]">
                        {monthNamesEn[cell.month - 1].slice(0, 3)} {cell.day}
                      </span>
                    ) : (
                      <span className="text-[10.5px] font-medium text-[var(--ws-muted)] pl-0.5">
                        {cell.day}
                      </span>
                    )}

                    {hasEvents && (
                      <span className="text-[9px] font-semibold text-[var(--ws-muted)] pr-0.5">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Event list in cell */}
                  <div className="space-y-0.5 flex-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => {
                      const isContest = ev.type === 'contest';
                      return (
                        <button
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveModalEvent(ev);
                          }}
                          className={`w-full text-left flex items-center gap-1 px-1 py-0.2 rounded text-[9.5px] leading-tight transition-all truncate group ${
                            isContest
                              ? 'text-amber-800 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-900/30'
                              : 'text-teal-800 dark:text-teal-300 hover:bg-teal-100/50 dark:hover:bg-teal-900/30'
                          }`}
                          title={`${ev.timeStr} • ${ev.title}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              isContest ? 'bg-amber-500' : 'bg-teal-500'
                            }`}
                          />
                          <span className="font-mono text-[9px] opacity-80 flex-shrink-0">
                            {ev.timeStr}
                          </span>
                          <span className="truncate font-medium">{ev.title}</span>
                        </button>
                      );
                    })}

                    {dayEvents.length > 2 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(cell.dateString);
                          setViewMode('agenda');
                        }}
                        className="text-[9px] font-semibold text-[var(--ws-accent)] hover:underline pl-0.5 leading-none block"
                      >
                        +{dayEvents.length - 2} sự kiện
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="bg-[var(--ws-panel)] border border-[var(--ws-border)] rounded-xl shadow-2xs overflow-hidden">
          {/* Week Headers */}
          <div className="grid grid-cols-7 border-b border-[var(--ws-border)] bg-[var(--ws-panel2)]/50 divide-x divide-[var(--ws-border)]">
            {weekDays.map((d) => (
              <div
                key={d.dateString}
                className={`py-1.5 px-1 text-center ${
                  d.isToday ? 'bg-[var(--ws-accent)]/10 font-bold' : ''
                }`}
              >
                <p className="text-[10px] uppercase tracking-wider text-[var(--ws-muted)]">
                  {d.dayName}
                </p>
                <div className="mt-0.5 flex items-center justify-center">
                  {d.isToday ? (
                    <span className="w-5 h-5 rounded-full bg-[var(--ws-accent)] text-white text-[10.5px] font-bold flex items-center justify-center shadow-2xs">
                      {d.dayNumber}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-[var(--ws-text)]">
                      {d.dayNumber}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Week Event Columns */}
          <div className="grid grid-cols-7 divide-x divide-[var(--ws-border)] min-h-[220px]">
            {weekDays.map((d) => {
              const dayEvents = eventsByDate[d.dateString] || [];
              return (
                <div key={d.dateString} className="p-1.5 space-y-1.5 bg-[var(--ws-panel)]">
                  {dayEvents.map((ev) => {
                    const isContest = ev.type === 'contest';
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setActiveModalEvent(ev)}
                        className={`w-full text-left p-1.5 rounded-lg border transition-all text-[11px] ${
                          isContest
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200 hover:border-amber-500/60'
                            : 'bg-teal-500/10 border-teal-500/30 text-teal-800 dark:text-teal-200 hover:border-teal-500/60'
                        }`}
                      >
                        <div className="flex items-center gap-1 font-mono text-[9.5px] opacity-80 mb-0.5">
                          <Clock size={10} /> {ev.timeStr}
                        </div>
                        <p className="font-semibold line-clamp-2 leading-tight">{ev.title}</p>
                        {ev.className && (
                          <p className="text-[9.5px] text-[var(--ws-muted)] mt-0.5 truncate">
                            {ev.className}
                          </p>
                        )}
                      </button>
                    );
                  })}

                  {dayEvents.length === 0 && (
                    <div className="py-6 text-center text-[10px] text-[var(--ws-muted)] opacity-40">
                      —
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Agenda / Schedule View */}
      {viewMode === 'agenda' && (
        <div className="bg-[var(--ws-panel)] border border-[var(--ws-border)] rounded-xl p-3.5 shadow-2xs">
          <div className="mb-2.5 pb-2 border-b border-[var(--ws-border)] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold font-serif text-[var(--ws-text)]">
                Lịch trình sự kiện sắp diễn ra
              </h3>
              <p className="text-[11px] text-[var(--ws-muted)] mt-0.5">
                Tổng hợp bài tập cần nộp và các kỳ thi theo thứ tự thời gian
              </p>
            </div>
            <span className="text-[11px] font-semibold text-[var(--ws-muted)] bg-[var(--ws-panel2)] px-2 py-0.5 rounded-md border border-[var(--ws-border)]">
              {filteredEvents.length} sự kiện
            </span>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-[var(--ws-border)] rounded-lg">
              <CalendarIcon size={24} className="text-[var(--ws-faint)] mx-auto mb-1.5" />
              <p className="text-xs text-[var(--ws-muted)]">
                Không tìm thấy sự kiện hoặc hạn chót nào phù hợp với bộ lọc.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEvents.map((ev) => {
                const isContest = ev.type === 'contest';
                return (
                  <div
                    key={ev.id}
                    onClick={() => setActiveModalEvent(ev)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-[var(--ws-panel2)] rounded-lg border border-[var(--ws-border)] hover:border-[var(--ws-accent)]/40 transition-all cursor-pointer gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isContest ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {isContest ? <Trophy size={15} /> : <BookOpen size={15} />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9.5px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                              isContest
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-teal-100 text-teal-800 border-teal-300'
                            }`}
                          >
                            {isContest ? 'Kỳ thi' : 'Bài tập'}
                          </span>
                          <span className="text-[11px] text-[var(--ws-muted)] font-mono">
                            {formatVN(ev.startDateTime)}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-[var(--ws-text)] mt-0.5 truncate">
                          {ev.title}
                        </p>
                        {ev.className && (
                          <p className="text-[10px] text-[var(--ws-muted)] mt-0.2">{ev.className}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--ws-panel)] border border-[var(--ws-border)] text-[11px] font-semibold text-[var(--ws-text)] hover:bg-[var(--ws-hover)] transition-colors">
                        Chi tiết <ExternalLink size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Calendar Bottom Legend & Info (Matching Google Calendar reference screenshot) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2 px-3 text-[11px] text-[var(--ws-muted)] border-t border-[var(--ws-border)]">
        <div>
          <p className="font-semibold text-[var(--ws-text)] text-[11.5px]">
            Programming Contests & Assignments Calendar
          </p>
          <p className="text-[10px] mt-0.5">
            Events shown in time zone: (GMT+07:00) Indochina Time - Ho Chi Minh City
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={downloadICS}
            className="hover:underline font-semibold text-[var(--ws-accent)]"
          >
            Xuất lịch (.ics)
          </button>
          <span>•</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> Bài tập
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Kỳ thi
          </span>
        </div>
      </div>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={activeModalEvent}
        onClose={() => setActiveModalEvent(null)}
        userRole={userRole}
      />
    </div>
  );
}
