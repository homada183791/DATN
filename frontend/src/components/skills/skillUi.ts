import type { MasteryLevel } from '../../api/skills';

export const CATEGORY_ORDER = ['BASICS', 'DATA_STRUCTURES', 'ALGORITHMS', 'DYNAMIC_PROGRAMMING', 'GRAPHS', 'MATH'];

/** Màu theo điểm nắm vững: đỏ (0) → vàng (0,5) → xanh (1), lấy từ màu trạng thái của theme. */
export function masteryColor(p: number) {
  const x = Math.max(0, Math.min(1, p));
  if (x < 0.5) {
    const t = Math.round((x / 0.5) * 100);
    return `color-mix(in srgb, var(--ws-warn) ${t}%, var(--ws-danger))`;
  }
  const t = Math.round(((x - 0.5) / 0.5) * 100);
  return `color-mix(in srgb, var(--ws-ok) ${t}%, var(--ws-warn))`;
}

export function masteryBg(p: number, strength = 26) {
  return `color-mix(in srgb, ${masteryColor(p)} ${strength}%, transparent)`;
}

export const LEVEL_TONE: Record<MasteryLevel, string> = {
  insufficient: 'text-(--ws-muted) bg-(--ws-panel2) border-(--ws-border)',
  not_yet: 'text-(--ws-danger) bg-(--ws-danger-soft) border-(--ws-danger)/30',
  learning: 'text-(--ws-warn) bg-(--ws-warn-soft) border-(--ws-warn)/30',
  proficient: 'text-(--ws-ok) bg-(--ws-ok-soft) border-(--ws-ok)/30',
  mastered: 'text-(--ws-on-accent) bg-(--ws-ok) border-(--ws-ok)',
};

export const pct = (p: number | null | undefined) => (p == null ? '—' : `${Math.round(p * 100)}%`);
