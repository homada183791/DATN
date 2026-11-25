/**
 * Theo dõi trạng thái trực tiếp của sinh viên trong kỳ thi (đang làm bài / rời tab / mất kết nối),
 * giữ trong bộ nhớ của backend. Không ghi DB: đây là trạng thái "ngay lúc này" cho màn hình giám sát.
 *
 * - active : trang làm bài đang được xem
 * - away   : sinh viên chuyển tab / rời cửa sổ (vẫn còn kết nối)
 * - offline: mất kết nối, đóng trang, hoặc quá lâu không gửi nhịp (heartbeat)
 */
export type PresenceState = 'active' | 'away' | 'offline';

export interface PresenceEntry {
  student_id: string;
  username: string;
  full_name: string | null;
  state: PresenceState;
  problem_id: string | null;
  /** Thời điểm bắt đầu trạng thái hiện tại (ms) — để giảng viên thấy "rời tab 25 giây". */
  since: number;
  /** Lần cuối nhận được tin từ sinh viên (ms). */
  last_seen: number;
}

export interface PresenceChange {
  contest_id: string;
  entry: PresenceEntry;
}

interface InternalEntry extends PresenceEntry {
  sockets: Map<string, PresenceState>;
}

export class ContestPresenceTracker {
  private readonly contests = new Map<string, Map<string, InternalEntry>>();
  /** socket id -> các (kỳ thi, sinh viên) socket đó đang báo trạng thái. */
  private readonly socketIndex = new Map<string, Set<string>>();

  constructor(private readonly staleMs = 45_000) {}

  /**
   * Ghi nhận một tin trạng thái/nhịp từ sinh viên.
   * Trả về bản ghi mới nếu trạng thái hoặc bài đang làm thay đổi (cần báo giảng viên), null nếu chỉ là nhịp.
   */
  update(
    contestId: string,
    student: { id: string; username: string; full_name?: string | null },
    socketId: string,
    state: Exclude<PresenceState, 'offline'>,
    problemId: string | null,
    now = Date.now(),
  ): PresenceEntry | null {
    let byStudent = this.contests.get(contestId);
    if (!byStudent) {
      byStudent = new Map();
      this.contests.set(contestId, byStudent);
    }
    const key = `${contestId}|${student.id}`;
    let idx = this.socketIndex.get(socketId);
    if (!idx) {
      idx = new Set();
      this.socketIndex.set(socketId, idx);
    }
    idx.add(key);

    let entry = byStudent.get(student.id);
    if (!entry) {
      entry = {
        student_id: student.id,
        username: student.username,
        full_name: student.full_name ?? null,
        state: 'offline',
        problem_id: null,
        since: now,
        last_seen: now,
        sockets: new Map(),
      };
      byStudent.set(student.id, entry);
    }
    entry.sockets.set(socketId, state);
    entry.last_seen = now;

    // Mở nhiều tab: chỉ cần một tab đang xem là "active".
    const merged: PresenceState = [...entry.sockets.values()].includes('active') ? 'active' : 'away';
    const problemChanged = problemId !== null && problemId !== entry.problem_id;
    if (problemId !== null) entry.problem_id = problemId;
    if (merged !== entry.state) {
      entry.state = merged;
      entry.since = now;
      return this.publicView(entry);
    }
    return problemChanged ? this.publicView(entry) : null;
  }

  /** Socket ngắt kết nối: sinh viên nào không còn socket nào thì thành offline. */
  disconnect(socketId: string, now = Date.now()): PresenceChange[] {
    const keys = this.socketIndex.get(socketId);
    this.socketIndex.delete(socketId);
    if (!keys) return [];
    const changes: PresenceChange[] = [];
    for (const key of keys) {
      const [contestId, studentId] = key.split('|');
      const entry = this.contests.get(contestId)?.get(studentId);
      if (!entry) continue;
      entry.sockets.delete(socketId);
      if (entry.sockets.size === 0) {
        if (entry.state !== 'offline') {
          entry.state = 'offline';
          entry.since = now;
          changes.push({ contest_id: contestId, entry: this.publicView(entry) });
        }
      } else {
        const merged: PresenceState = [...entry.sockets.values()].includes('active') ? 'active' : 'away';
        if (merged !== entry.state) {
          entry.state = merged;
          entry.since = now;
          changes.push({ contest_id: contestId, entry: this.publicView(entry) });
        }
      }
    }
    return changes;
  }

  /** Ai quá lâu không gửi nhịp (máy treo, mất mạng mà socket chưa kịp đóng) thì coi là offline. */
  sweep(now = Date.now()): PresenceChange[] {
    const changes: PresenceChange[] = [];
    for (const [contestId, byStudent] of this.contests) {
      for (const entry of byStudent.values()) {
        if (entry.state !== 'offline' && now - entry.last_seen > this.staleMs) {
          entry.state = 'offline';
          entry.since = now;
          entry.sockets.clear();
          changes.push({ contest_id: contestId, entry: this.publicView(entry) });
        }
      }
    }
    return changes;
  }

  snapshot(contestId: string): PresenceEntry[] {
    return [...(this.contests.get(contestId)?.values() ?? [])].map((e) => this.publicView(e));
  }

  private publicView(e: InternalEntry): PresenceEntry {
    return {
      student_id: e.student_id,
      username: e.username,
      full_name: e.full_name,
      state: e.state,
      problem_id: e.problem_id,
      since: e.since,
      last_seen: e.last_seen,
    };
  }
}
