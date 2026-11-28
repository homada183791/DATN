import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface HeatmapDay {
  date: string;  // YYYY-MM-DD
  count: number;
}

interface ActivityHeatmapProps {
  data: HeatmapDay[];
}

const LEVELS = [
  { min: 0, max: 0, bg: 'bg-(--ws-panel2) border border-(--ws-border-soft)', titleKey: 'activityHeatmap.zero' },
  { min: 1, max: 2, bg: 'bg-[color-mix(in_srgb,var(--ws-ok)_25%,var(--ws-panel2))] border border-(--ws-ok)/20', titleKey: 'activityHeatmap.oneToTwo' },
  { min: 3, max: 5, bg: 'bg-[color-mix(in_srgb,var(--ws-ok)_50%,var(--ws-panel2))] border border-(--ws-ok)/35', titleKey: 'activityHeatmap.threeToFive' },
  { min: 6, max: 9, bg: 'bg-[color-mix(in_srgb,var(--ws-ok)_75%,var(--ws-panel2))] border border-(--ws-ok)/50', titleKey: 'activityHeatmap.sixToNine' },
  { min: 10, max: Infinity, bg: 'bg-(--ws-ok) border border-(--ws-ok)', titleKey: 'activityHeatmap.tenPlus' },
];

function getLevel(count: number) {
  return LEVELS.find((l) => count >= l.min && count <= l.max) ?? LEVELS[0];
}

const MONTH_NAMES_VI = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS_VI = ['CN', 'T2', '', 'T4', '', 'T6', ''];
const DAY_LABELS_EN = ['Sun', 'Mon', '', 'Wed', '', 'Fri', ''];

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const { t, i18n } = useTranslation();
  const isEnglish = (i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase().startsWith('en');
  const monthNames = isEnglish ? MONTH_NAMES_EN : MONTH_NAMES_VI;
  const dayLabels = isEnglish ? DAY_LABELS_EN : DAY_LABELS_VI;
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
      monthLabelsArr.push({ weekIdx: wIdx, label: monthNames[month] });
    });

    return { weeks: weeksArr, monthLabels: monthLabelsArr };
  }, [data, monthNames]);

  const totalContributions = data.reduce((s, d) => s + d.count, 0);

  return (
    <section
      aria-label={t('activityHeatmap.title', { count: totalContributions })}
      className="bg-(--ws-panel) border border-(--ws-border) rounded-md p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-(--ws-text) font-serif flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-sm bg-(--ws-ok) inline-block shrink-0" aria-hidden="true" />
          <span className="tabular-nums">{t('activityHeatmap.title', { count: totalContributions })}</span>
        </h3>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex gap-0 min-w-max">
          {/* Day labels */}
          <div className="flex flex-col gap-[3px] mr-2 mt-6">
            {dayLabels.map((label, i) => (
              <div key={i} className="h-[13px] text-[9px] text-(--ws-muted) leading-none flex items-center">
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
                  <div key={wIdx} className="w-[13px] text-[9px] text-(--ws-muted) leading-none">
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
                        className={`w-[13px] h-[13px] rounded-xs ${day.isFuture ? 'bg-transparent' : level.bg} ${day.isToday ? 'ring-2 ring-(--ws-accent)' : ''} transition-all`}
                        title={day.isFuture ? '' : t('activityHeatmap.day', { date: day.date, count: day.count })}
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
      <div className="flex items-center justify-end gap-1.5 mt-3">
        <span className="text-[10px] text-(--ws-muted)">{t('activityHeatmap.less')}</span>
        {LEVELS.map((l, i) => (
          <div key={i} className={`w-[13px] h-[13px] rounded-xs ${l.bg}`} title={t(l.titleKey)} />
        ))}
        <span className="text-[10px] text-(--ws-muted)">{t('activityHeatmap.more')}</span>
      </div>
    </section>
  );
}
