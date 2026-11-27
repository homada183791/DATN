/**
 * Đánh số "lần nộp thứ N" cho từng bài nộp (cũ nhất = 1), thay cho việc hiện mã bài nộp nội bộ.
 * Đếm riêng theo từng (người nộp, bài).
 */
export function attemptNumbers<T extends { id: string }>(
  subs: T[],
  groupKey: (s: T) => string,
  time: (s: T) => string,
): Map<string, number> {
  const sorted = [...subs].sort((a, b) => new Date(time(a)).getTime() - new Date(time(b)).getTime());
  const counter = new Map<string, number>();
  const result = new Map<string, number>();
  for (const s of sorted) {
    const k = groupKey(s);
    const n = (counter.get(k) ?? 0) + 1;
    counter.set(k, n);
    result.set(s.id, n);
  }
  return result;
}
