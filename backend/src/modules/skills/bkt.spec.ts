import { bktUpdate, bktPredictCorrect, computeAuc, masteryLevel, classificationMetrics } from './bkt';

describe('BKT', () => {
  it('ví dụ trong tài liệu: sai, đúng, đúng → 0,15 → 0,49 → 0,83', () => {
    let p = 0.3;
    p = bktUpdate(p, false);
    expect(p).toBeCloseTo(0.146, 2);
    p = bktUpdate(p, true);
    expect(p).toBeCloseTo(0.491, 2);
    p = bktUpdate(p, true);
    expect(p).toBeCloseTo(0.831, 2);
  });

  it('một lần đúng không nhảy lên 100%, một lần sai không sụt về 0', () => {
    expect(bktUpdate(0.3, true)).toBeLessThan(0.8);
    expect(bktUpdate(0.9, false)).toBeGreaterThan(0.5);
  });

  it('xác suất đúng nằm giữa guess và 1 - slip', () => {
    expect(bktPredictCorrect(0)).toBeCloseTo(0.2);
    expect(bktPredictCorrect(1)).toBeCloseTo(0.9);
  });

  it('xếp mức, dưới 3 lượt là chưa đủ dữ liệu', () => {
    expect(masteryLevel(0.99, 2)).toBe('insufficient');
    expect(masteryLevel(0.96, 5)).toBe('mastered');
    expect(masteryLevel(0.8, 5)).toBe('proficient');
    expect(masteryLevel(0.5, 5)).toBe('learning');
    expect(masteryLevel(0.2, 5)).toBe('not_yet');
  });

  it('AUC: tách hoàn hảo = 1, ngược = 0, ngẫu nhiên = 0,5', () => {
    const good = [{ pred: 0.9, actual: true }, { pred: 0.8, actual: true }, { pred: 0.2, actual: false }];
    expect(computeAuc(good)).toBe(1);
    expect(computeAuc(good.map((x) => ({ ...x, actual: !x.actual })))).toBe(0);
    expect(computeAuc([{ pred: 0.5, actual: true }, { pred: 0.5, actual: false }])).toBe(0.5);
    expect(computeAuc([{ pred: 0.5, actual: true }])).toBeNull();
  });

  it('accuracy/F1', () => {
    const m = classificationMetrics([
      { pred: 0.9, actual: true }, { pred: 0.6, actual: false }, { pred: 0.1, actual: false }, { pred: 0.3, actual: true },
    ]);
    expect(m.accuracy).toBe(0.5);
    expect(m.f1).toBeCloseTo(0.5);
  });
});
