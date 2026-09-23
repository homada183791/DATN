import { useMemo } from 'react';

interface HeatmapDay {
  date: string;  // YYYY-MM-DD
  count: number;
}

interface ActivityHeatmapProps {
  data: HeatmapDay[];
}

const LEVELS = [
  { min: 0, max: 0, bg: 'bg-[#ebedf0]', title: '0 bài nộp' },
  { min: 1, max: 2, bg: 'bg-emerald-200', title: '1–2 bài nộp' },
  { min: 3, max: 5, bg: 'bg-emerald-400', title: '3–5 bài nộp' },
  { min: 6, max: 9, bg: 'bg-emerald-600', title: '6–9 bài nộp' },
  { min: 10, max: Infinity, bg: 'bg-emerald-800', title: '10+ bài nộp' },
];

function getLevel(count: number) {
  return LEVELS.find((l) => count >= l.min && count <= l.max) ?? LEVELS[0];
}

const MONTH_NAMES = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
const DAY_LABELS = ['CN', 'T2', '', 'T4', '', 'T6', ''];

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Tạo map từ date string -> count
    const countMap = new Map<string, number>();
    for (const d of data) {
      countMap.set(d.date, d.count);
    }

    // Điểm bắt đầu: 52 tuần + offset đến đầu tuần
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    // Lùi về đầu tuần (Chủ nhật)
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const weeksArr: Array<Array<{ date: string; count: number; isToday: boolean; isFuture: boolean }>> = [];
    const monthMap = new Map<number, number>(); // weekIndex -> month number

    let current = new Date(startDate);
    let weekIdx = 0;

    while (current <= today || weeksArr.length < 53) {
      const week: typeof weeksArr[0] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = current.toISOString().slice(0, 10);
        const isToday = current.getTime() === today.getTime();
        const isFuture = current > today;

        // Track month label theo tuần
        if (d === 0) {
          const m = current.getMonth();
          if (!Array.from(monthMap.values()).includes(m) || weekIdx === 0) {
            monthMap.set(weekIdx, m);
          }
        }

        week.push({
          date: dateStr,
          count: countMap.get(dateStr) ?? 0,
          isToday,
          isFuture,
        });
        current.setDate(current.getDate() + 1);
      }
      weeksArr.push(week);
      weekIdx++;
      if (current > today && weeksArr.length >= 53) break;
    }

    const monthLabelsArr: Array<{ weekIdx: number; label: string }> = [];
    monthMap.forEach((month, wIdx) => {
      monthLabelsArr.push({ weekIdx: wIdx, label: MONTH_NAMES[month] });
    });

    return { weeks: weeksArr, monthLabels: monthLabelsArr };
  }, [data]);

  const totalContributions = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#191919] font-serif flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-emerald-600 inline-block" />
          Hoạt động nộp bài ({totalContributions} lần trong năm qua)
        </h3>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex gap-0 min-w-max">
          {/* Day labels */}
          <div className="flex flex-col gap-[3px] mr-2 mt-6">
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="h-[13px] text-[9px] text-[#8a8073] leading-none flex items-center">
                {label}
              </div>
            ))}
          </div>

          {/* Weeks grid */}
          <div className="flex flex-col">
            {/* Month labels */}
            <div className="flex gap-[3px] mb-1">
              {weeks.map((_, wIdx) => {
                const monthEntry = monthLabels.find((m) => m.weekIdx === wIdx);
                return (
                  <div key={wIdx} className="w-[13px] text-[9px] text-[#8a8073] leading-none">
                    {monthEntry?.label ?? ''}
                  </div>
                );
              })}
            </div>

            {/* Cells */}
            <div className="flex gap-[3px]">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-[3px]">
                  {week.map((day) => {
                    const level = getLevel(day.isFuture ? 0 : day.count);
                    return (
                      <div
                        key={day.date}
                        className={`w-[13px] h-[13px] rounded-[2px] ${day.isFuture ? 'bg-transparent' : level.bg} ${day.isToday ? 'ring-2 ring-[#193a2b]' : ''} transition-all`}
                        title={day.isFuture ? '' : `${day.date}: ${day.count} lần nộp`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-3">
        <span className="text-[10px] text-[#8a8073]">Ít hơn</span>
        {LEVELS.map((l, i) => (
          <div key={i} className={`w-[13px] h-[13px] rounded-[2px] ${l.bg}`} title={l.title} />
        ))}
        <span className="text-[10px] text-[#8a8073]">Nhiều hơn</span>
      </div>
    </div>
  );
}
