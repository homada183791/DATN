/**
 * Bayesian Knowledge Tracing (Corbett & Anderson, 1995) — thay cho mạng LSTM của bài báo KCGen-KT:
 * vẫn cho điểm nắm vững 0–1 từng kỹ năng nhưng không cần huấn luyện, giải thích được từng bước.
 *
 *   P(L0) biết sẵn  |  P(T) học thêm sau mỗi bài  |  P(S) biết mà vẫn sai  |  P(G) chưa biết mà đoán đúng
 */
export interface BktParams {
  pInit: number;
  pLearn: number;
  pSlip: number;
  pGuess: number;
}

export const DEFAULT_BKT: BktParams = { pInit: 0.3, pLearn: 0.1, pSlip: 0.1, pGuess: 0.2 };

const clamp = (x: number) => Math.min(0.9999, Math.max(0.0001, x));

/** Cập nhật xác suất đã nắm kỹ năng sau một lần làm bài (đúng/sai), rồi cộng phần học thêm. */
export function bktUpdate(p: number, correct: boolean, params: BktParams = DEFAULT_BKT): number {
  const { pSlip: s, pGuess: g, pLearn: t } = params;
  const posterior = correct
    ? (p * (1 - s)) / (p * (1 - s) + (1 - p) * g)
    : (p * s) / (p * s + (1 - p) * (1 - g));
  return clamp(posterior + (1 - posterior) * t);
}

/** Xác suất làm đúng bài tiếp theo nếu đang nắm kỹ năng ở mức p. */
export function bktPredictCorrect(p: number, params: BktParams = DEFAULT_BKT): number {
  return p * (1 - params.pSlip) + (1 - p) * params.pGuess;
}

export type MasteryLevel = 'insufficient' | 'not_yet' | 'learning' | 'proficient' | 'mastered';

/** Đổi điểm ra mức. Dưới 3 lượt làm thì chưa đủ dữ liệu để xếp mức. */
export function masteryLevel(p: number, attempts: number): MasteryLevel {
  if (attempts < 3) return 'insufficient';
  if (p >= 0.95) return 'mastered';
  if (p >= 0.7) return 'proficient';
  if (p >= 0.4) return 'learning';
  return 'not_yet';
}

/** AUC (diện tích dưới đường ROC) bằng cách đếm cặp (dương, âm) — đủ nhanh với vài chục nghìn mẫu. */
export function computeAuc(samples: Array<{ pred: number; actual: boolean }>): number | null {
  const pos = samples.filter((x) => x.actual).map((x) => x.pred);
  const neg = samples.filter((x) => !x.actual).map((x) => x.pred);
  if (pos.length === 0 || neg.length === 0) return null;
  // xếp hạng (rank-sum, Mann–Whitney)
  const all = samples.map((x, i) => ({ ...x, i })).sort((a, b) => a.pred - b.pred);
  const ranks = new Array<number>(all.length);
  for (let i = 0; i < all.length; ) {
    let j = i;
    while (j + 1 < all.length && all[j + 1].pred === all[i].pred) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[k] = avg;
    i = j + 1;
  }
  let rankSumPos = 0;
  all.forEach((x, k) => {
    if (x.actual) rankSumPos += ranks[k];
  });
  return (rankSumPos - (pos.length * (pos.length + 1)) / 2) / (pos.length * neg.length);
}

export function classificationMetrics(samples: Array<{ pred: number; actual: boolean }>, threshold = 0.5) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const s of samples) {
    const yhat = s.pred >= threshold;
    if (yhat && s.actual) tp++;
    else if (yhat && !s.actual) fp++;
    else if (!yhat && s.actual) fn++;
    else tn++;
  }
  const n = samples.length;
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  return {
    n,
    accuracy: n ? (tp + tn) / n : null,
    f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0,
    positive_rate: n ? (tp + fn) / n : null,
  };
}
