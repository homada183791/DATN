import { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar as CalendarIcon,
  BookOpen,
  Trophy,
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
  const [showMonthPicker, setShowMonthPicker] = useState<boolean>(false);
  const monthPickerRef = useRef<HTMLDivElement>(null);

  // Close month picker when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
        setShowMonthPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <>
      {/* Unified Google Calendar Card */}
      <div className="bg-[var(--ws-panel)] border border-[var(--ws-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* 1. Integrated Header Toolbar */}
        <div className="p-2.5 px-3.5 border-b border-[var(--ws-border)] bg-[var(--ws-panel2)]/35 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Left: Today + Arrows + Month/Year Picker Dropdown */}
          <div className="flex items-center gap-2">
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

            {/* Month/Year Title with dropdown trigger (as in reference image: September 2026 ▾) */}
            <div className="relative" ref={monthPickerRef}>
              <button
                type="button"
                onClick={() => setShowMonthPicker((v) => !v)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[var(--ws-hover)] transition-colors group cursor-pointer"
                title="Chọn tháng / năm"
              >
                <h2 className="text-base font-bold font-serif text-[var(--ws-text)] tracking-tight">
                  {monthNamesEn[currentMonth - 1]} {currentYear}
                </h2>
                <ChevronDown
                  size={14}
                  className={`text-[var(--ws-muted)] group-hover:text-[var(--ws-text)] transition-transform duration-200 ${
                    showMonthPicker ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Quick Month & Year Popover */}
              {showMonthPicker && (
                <div className="absolute top-full left-0 mt-1.5 w-64 p-3 bg-[var(--ws-panel)] border border-[var(--ws-border)] rounded-xl shadow-xl z-50">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--ws-border)]">
                    <span className="text-xs font-bold text-[var(--ws-text)]">Năm {currentYear}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentYear((y) => y - 1)}
                        className="p-1 rounded hover:bg-[var(--ws-hover)] text-[var(--ws-muted)] hover:text-[var(--ws-text)]"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <button
                        onClick={() => setCurrentYear((y) => y + 1)}
                        className="p-1 rounded hover:bg-[var(--ws-hover)] text-[var(--ws-muted)] hover:text-[var(--ws-text)]"
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    {monthNamesEn.map((mName, idx) => {
                      const mNum = idx + 1;
                      const isSelected = mNum === currentMonth;
                      return (
                        <button
                          key={mName}
                          onClick={() => {
                            setCurrentMonth(mNum);
                            setShowMonthPicker(false);
                          }}
                          className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-[var(--ws-accent)] text-white shadow-2xs'
                              : 'text-[var(--ws-muted)] hover:text-[var(--ws-text)] hover:bg-[var(--ws-hover)]'
                          }`}
                        >
                          {mName.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
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
                style={
                  typeFilter === 'homework'
                    ? { backgroundColor: 'var(--ws-hw-dot)', color: '#fff' }
                    : undefined
                }
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 ${
                  typeFilter === 'homework'
                    ? 'shadow-2xs text-white'
                    : 'text-[var(--ws-muted)] hover:text-[var(--ws-text)]'
                }`}
              >
                <BookOpen size={11} /> Bài tập
              </button>
              <button
                onClick={() => setTypeFilter('contest')}
                style={
                  typeFilter === 'contest'
                    ? { backgroundColor: 'var(--ws-contest-dot)', color: '#fff' }
                    : undefined
                }
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 ${
                  typeFilter === 'contest'
                    ? 'shadow-2xs text-white'
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

        {/* 2. Month View Grid */}
        {viewMode === 'month' && (
          <div className="flex flex-col">
            {/* Day of week headers (Centered like Google Calendar) */}
            <div className="grid grid-cols-7 border-b border-[var(--ws-border)] bg-[var(--ws-panel2)]/50 text-center text-[11px] font-bold text-[var(--ws-muted)] py-1.5">
              {DAYS_OF_WEEK.map((d) => (
                <div key={d.key} className="tracking-wider">
                  <span className="hidden sm:inline">{d.labelEn}</span>
                  <span className="sm:hidden">{d.labelVi}</span>
                </div>
              ))}
            </div>

            {/* Month Day Grid - Balanced cell proportions min-h-[82px] md:min-h-[90px] */}
            <div className="grid grid-cols-7 divide-x divide-y divide-[var(--ws-border)]">
              {monthGridDays.map((cell) => {
                const dayEvents = eventsByDate[cell.dateString] || [];
                const hasEvents = dayEvents.length > 0;

                return (
                  <div
                    key={cell.dateString}
                    onClick={() => setSelectedDate(cell.dateString)}
                    className={`min-h-[82px] md:min-h-[90px] p-1.5 transition-colors flex flex-col justify-start cursor-pointer ${
                      cell.isCurrentMonth
                        ? 'bg-[var(--ws-panel)] hover:bg-[var(--ws-panel2)]/30'
                        : 'bg-[var(--ws-panel2)]/20 opacity-40'
                    }`}
                  >
                    {/* Centered Date Header as shown in the Codeforces screenshot */}
                    <div className="relative text-center mb-1 leading-none">
                      {cell.isToday ? (
                        <div className="w-5 h-5 rounded-full bg-[var(--ws-accent)] text-white font-bold text-[10.5px] flex items-center justify-center mx-auto shadow-2xs">
                          {cell.day}
                        </div>
                      ) : cell.isFirstOfMonth ? (
                        <span className="text-[10.5px] font-bold text-[var(--ws-text)]">
                          {monthNamesEn[cell.month - 1].slice(0, 3)} {cell.day}
                        </span>
                      ) : (
                        <span
                          className={`text-[10.5px] font-medium ${
                            cell.isCurrentMonth ? 'text-[var(--ws-text)]' : 'text-[var(--ws-muted)]'
                          }`}
                        >
                          {cell.day}
                        </span>
                      )}

                      {hasEvents && (
                        <span className="absolute right-0 top-0 text-[9px] font-semibold text-[var(--ws-muted)] opacity-70 pr-0.5">
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
                            style={{
                              backgroundColor: isContest ? 'var(--ws-contest-bg)' : 'var(--ws-hw-bg)',
                              color: isContest ? 'var(--ws-contest-text)' : 'var(--ws-hw-text)',
                              border: `1px solid ${isContest ? 'var(--ws-contest-border)' : 'var(--ws-hw-border)'}`,
                            }}
                            className="w-full text-left flex items-center gap-1 px-1 py-0.5 rounded text-[9.5px] leading-tight transition-all truncate group hover:brightness-110"
                            title={`${ev.timeStr} • ${ev.title}`}
                          >
                            <span
                              style={{
                                backgroundColor: isContest ? 'var(--ws-contest-dot)' : 'var(--ws-hw-dot)',
                              }}
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
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
                          className="text-[9px] font-semibold text-[var(--ws-accent)] hover:underline pl-0.5 leading-none block mt-0.5"
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

        {/* 3. Week View */}
        {viewMode === 'week' && (
          <div className="flex flex-col">
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
            <div className="grid grid-cols-7 divide-x divide-[var(--ws-border)] min-h-[260px]">
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
                          style={{
                            backgroundColor: isContest ? 'var(--ws-contest-bg)' : 'var(--ws-hw-bg)',
                            color: isContest ? 'var(--ws-contest-text)' : 'var(--ws-hw-text)',
                            borderColor: isContest ? 'var(--ws-contest-border)' : 'var(--ws-hw-border)',
                          }}
                          className="w-full text-left p-1.5 rounded-lg border transition-all text-[11px] hover:brightness-105"
                        >
                          <div className="flex items-center gap-1 font-mono text-[9.5px] opacity-80 mb-0.5">
                            <Clock size={10} /> {ev.timeStr}
                          </div>
                          <p className="font-semibold line-clamp-2 leading-tight">{ev.title}</p>
                          {ev.className && (
                            <p className="text-[9.5px] opacity-75 mt-0.5 truncate">
                              {ev.className}
                            </p>
                          )}
                        </button>
                      );
                    })}

                    {dayEvents.length === 0 && (
                      <div className="py-8 text-center text-[10px] text-[var(--ws-muted)] opacity-40">
                        —
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Agenda / Schedule View */}
        {viewMode === 'agenda' && (
          <div className="p-3.5">
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
                          style={{
                            backgroundColor: isContest ? 'var(--ws-contest-bg)' : 'var(--ws-hw-bg)',
                            color: isContest ? 'var(--ws-contest-text)' : 'var(--ws-hw-text)',
                          }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        >
                          {isContest ? <Trophy size={15} /> : <BookOpen size={15} />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              style={{
                                backgroundColor: isContest ? 'var(--ws-contest-bg)' : 'var(--ws-hw-bg)',
                                color: isContest ? 'var(--ws-contest-text)' : 'var(--ws-hw-text)',
                                borderColor: isContest ? 'var(--ws-contest-border)' : 'var(--ws-hw-border)',
                              }}
                              className="text-[9.5px] font-bold uppercase px-1.5 py-0.2 rounded border"
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

        {/* 5. Calendar Bottom Legend & Info (Matching Google Calendar in Codeforces screenshot) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 px-4 text-xs text-[var(--ws-muted)] border-t border-[var(--ws-border)] bg-[var(--ws-panel2)]/25">
          <div>
            <p className="font-semibold text-[var(--ws-text)] text-[11.5px]">
              Programming Contests & Assignments Calendar
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[10.5px] mt-0.5">
              <span>Events shown in time zone: (GMT+07:00) Indochina Time - Ho Chi Minh City</span>
              <span>•</span>
              <button
                onClick={downloadICS}
                className="hover:underline font-semibold text-[var(--ws-accent)]"
              >
                Xuất lịch (.ics)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 self-end sm:self-center">
            <div className="flex items-center gap-2.5 text-[10.5px]">
              <span className="flex items-center gap-1">
                <span
                  style={{ backgroundColor: 'var(--ws-hw-dot)' }}
                  className="w-1.5 h-1.5 rounded-full"
                />{' '}
                Bài tập
              </span>
              <span className="flex items-center gap-1">
                <span
                  style={{ backgroundColor: 'var(--ws-contest-dot)' }}
                  className="w-1.5 h-1.5 rounded-full"
                />{' '}
                Kỳ thi
              </span>
            </div>

            <a
              href="https://calendar.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-semibold text-[var(--ws-text)] hover:text-[var(--ws-accent)] transition-colors border border-[var(--ws-border)] bg-[var(--ws-panel)] px-2 py-0.5 rounded-md shadow-2xs"
              title="Mở Google Calendar"
            >
              <span className="text-blue-500 font-bold">G</span>
              <span className="text-red-500 font-bold">o</span>
              <span className="text-yellow-500 font-bold">o</span>
              <span className="text-blue-500 font-bold">g</span>
              <span className="text-green-500 font-bold">l</span>
              <span className="text-red-500 font-bold">e</span>
              <span className="text-[var(--ws-text)] font-semibold ml-0.5">Calendar</span>
            </a>
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={activeModalEvent}
        onClose={() => setActiveModalEvent(null)}
        userRole={userRole}
      />
    </>
  );
}
