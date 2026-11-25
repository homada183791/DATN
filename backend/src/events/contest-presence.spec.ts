import { ContestPresenceTracker } from './contest-presence';

describe('ContestPresenceTracker', () => {
  const C = 'contest-1';
  const st = { id: 's1', username: 'an', full_name: 'Nguyễn An' };

  it('báo thay đổi khi vào thi, rời tab và quay lại; nhịp thường thì không', () => {
    const t = new ContestPresenceTracker();
    expect(t.update(C, st, 'sock1', 'active', 'p1', 1000)?.state).toBe('active');
    expect(t.update(C, st, 'sock1', 'active', 'p1', 2000)).toBeNull(); // chỉ là nhịp
    const away = t.update(C, st, 'sock1', 'away', null, 3000);
    expect(away).toMatchObject({ state: 'away', since: 3000, problem_id: 'p1' });
    expect(t.update(C, st, 'sock1', 'active', null, 9000)).toMatchObject({ state: 'active', since: 9000 });
  });

  it('đổi bài cũng được báo', () => {
    const t = new ContestPresenceTracker();
    t.update(C, st, 'sock1', 'active', 'p1', 1000);
    expect(t.update(C, st, 'sock1', 'active', 'p2', 2000)).toMatchObject({ problem_id: 'p2' });
  });

  it('mở 2 tab: chỉ offline khi đóng cả hai, còn một tab đang xem thì vẫn active', () => {
    const t = new ContestPresenceTracker();
    t.update(C, st, 'a', 'active', 'p1', 1000);
    t.update(C, st, 'b', 'away', 'p1', 1000);
    expect(t.snapshot(C)[0].state).toBe('active');
    expect(t.disconnect('a', 2000)).toEqual([
      { contest_id: C, entry: expect.objectContaining({ state: 'away' }) },
    ]);
    expect(t.disconnect('b', 3000)).toEqual([
      { contest_id: C, entry: expect.objectContaining({ state: 'offline', since: 3000 }) },
    ]);
  });

  it('quá lâu không có nhịp thì thành offline', () => {
    const t = new ContestPresenceTracker(45_000);
    t.update(C, st, 'a', 'active', 'p1', 0);
    expect(t.sweep(30_000)).toEqual([]);
    expect(t.sweep(50_000)).toEqual([
      { contest_id: C, entry: expect.objectContaining({ state: 'offline' }) },
    ]);
    // gửi nhịp lại sau đó thì active trở lại
    expect(t.update(C, st, 'a', 'active', null, 60_000)?.state).toBe('active');
  });

  it('kỳ thi khác nhau tách biệt', () => {
    const t = new ContestPresenceTracker();
    t.update('c1', st, 'a', 'active', null, 0);
    expect(t.snapshot('c2')).toEqual([]);
  });
});
