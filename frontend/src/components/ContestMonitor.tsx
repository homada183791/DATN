import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Ban,
  Eye,
  EyeOff,
  Loader2,
  RotateCcw,
  Search,
  ShieldAlert,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from 'lucide-react';
import { ApiError } from '../api/http';
import {
  fetchContestDetail,
  fetchContestSessions,
  fetchContestViolations,
  resetContestSession,
  type ContestPresenceDto,
  type ContestSessionDto,
} from '../api/contests';
import { createSocket } from '../api/socket';
import { notifyGlobalToast } from '../context/ToastContext';

/**
 * Màn hình giám sát kỳ thi trực tiếp cho giảng viên.
 * Mỗi sinh viên là một ô: đang làm bài / rời tab (đếm giây) / mất kết nối / bị loại,
 * kèm bài đang làm, số lần cảnh báo và lần vi phạm gần nhất. Bên phải là dòng diễn biến.
 * Dữ liệu: REST lúc mở (danh sách thí sinh + nhật ký vi phạm) + socket (trạng thái, vi phạm mới).
 */

type LiveState = 'active' | 'away' | 'offline' | 'unknown';

interface StudentTile {
  student_id: string;
  username: string;
  full_name: string | null;
  cheat_warnings: number;
  is_disqualified: boolean;
  state: LiveState;
  /** ms theo đồng hồ máy giảng viên (đã bù lệch giờ với server). */
  since: number | null;
  problem_id: string | null;
  last_violation: { reason: string; at: string } | null;
  /** để nháy viền khi vừa vi phạm */
  flashAt: number;
}

type FeedKind = 'violation' | 'away' | 'back' | 'offline' | 'online' | 'reset' | 'disqualified';
interface FeedItem {
  id: string;
  kind: FeedKind;
  student_id: string;
  name: string;
  at: number;
  reason?: string;
  problem_id?: string | null;
  warnings?: number;
}

type Filter = 'all' | 'attention' | 'away' | 'offline';

const MAX_FEED = 200;

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
    osc.onended = () => void ctx.close();
  } catch {
    /* trình duyệt chặn âm thanh: bỏ qua */
  }
}

function formatDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function clock(ms: number) {
  return new Date(ms).toLocaleTimeString('vi-VN', { hour12: false, timeZone: 'Asia/Ho_Chi_Minh' });
}

export default function ContestMonitor({
  contestId,
  contestTitle,
  status,
  onClose,
}: {
  contestId: string;
  contestTitle?: string;
  status?: 'upcoming' | 'running' | 'ended';
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [tiles, setTiles] = useState<Map<string, StudentTile>>(new Map());
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [maxWarnings, setMaxWarnings] = useState(3);
  const [problemNames, setProblemNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [sound, setSound] = useState(() => {
    try {
      return localStorage.getItem('jh-monitor-sound') !== '0';
    } catch {
      return true;
    }
  });
  const [now, setNow] = useState(() => Date.now());
  const [resetting, setResetting] = useState<string | null>(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  /** lệch giờ server - máy giảng viên, để đếm "rời tab bao lâu" cho đúng */
  const skewRef = useRef(0);

  const reasonLabel = useCallback(
    (r?: string) => t(`contestMonitor.reason.${r ?? 'OTHER'}`, { defaultValue: r ?? '' }),
    [t],
  );

  const pushFeed = useCallback((item: Omit<FeedItem, 'id'>) => {
    setFeed((prev) => [{ ...item, id: `${item.kind}-${item.student_id}-${item.at}-${Math.random()}` }, ...prev].slice(0, MAX_FEED));
  }, []);

  // Bản sao đồng bộ của tiles: đọc trạng thái cũ để quyết định ghi dòng diễn biến/âm báo
  // ngoài hàm cập nhật state (StrictMode gọi hàm cập nhật 2 lần → tránh ghi trùng).
  const tilesRef = useRef<Map<string, StudentTile>>(new Map());
  const upsertTile = useCallback((id: string, patch: (prev: StudentTile | undefined) => StudentTile) => {
    const next = new Map(tilesRef.current);
    next.set(id, patch(tilesRef.current.get(id)));
    tilesRef.current = next;
    setTiles(next);
  }, []);

  const blank = (id: string, username: string, full_name: string | null = null): StudentTile => ({
    student_id: id,
    username,
    full_name,
    cheat_warnings: 0,
    is_disqualified: false,
    state: 'unknown',
    since: null,
    problem_id: null,
    last_violation: null,
    flashAt: 0,
  });

  // Đồng hồ 1 giây cho bộ đếm "rời tab 0:25"
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Tải dữ liệu ban đầu
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchContestSessions(contestId),
      fetchContestViolations(contestId, 150).catch(() => []),
      fetchContestDetail(contestId).catch(() => null),
    ])
      .then(([sessions, violations, detail]) => {
        if (cancelled) return;
        setMaxWarnings(sessions.max_warnings ?? 3);
        {
          const next = new Map(tilesRef.current);
          for (const s of sessions.sessions as ContestSessionDto[]) {
            const old = next.get(s.student_id) ?? blank(s.student_id, s.username, s.full_name ?? null);
            next.set(s.student_id, {
              ...old,
              username: s.username,
              full_name: s.full_name ?? old.full_name,
              cheat_warnings: s.cheat_warnings,
              is_disqualified: s.is_disqualified,
              last_violation: s.last_violation
                ? { reason: String(s.last_violation.reason), at: s.last_violation.at }
                : old.last_violation,
            });
          }
          tilesRef.current = next;
          setTiles(next);
        }
        const names = new Map((sessions.sessions as ContestSessionDto[]).map((s) => [s.student_id, s.full_name || s.username]));
        setFeed((prev) => [
          ...prev,
          ...violations.map((v) => ({
            id: `hist-${v.id}`,
            kind: 'violation' as const,
            student_id: v.student_id,
            name: names.get(v.student_id) ?? v.username,
            at: new Date(v.at).getTime(),
            reason: v.reason,
            problem_id: v.problem_id,
            warnings: v.warnings_after,
          })),
        ].slice(0, MAX_FEED));
        const map: Record<string, string> = {};
        (detail?.problems ?? []).forEach((p: { problem_id: string; problem?: { title?: string } }, i: number) => {
          map[p.problem_id] = `${String.fromCharCode(65 + i)}. ${p.problem?.title ?? ''}`;
        });
        setProblemNames(map);
      })
      .catch((err) => {
        notifyGlobalToast(err instanceof ApiError ? err.message : t('contestMonitor.loadFailed'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId]);

  // Kết nối trực tiếp khi kỳ thi đang diễn ra
  useEffect(() => {
    if (status !== 'running') return;
    const socket = createSocket();
    socket.on('connect', () => {
      setLive(true);
      socket.emit('join_admin_dashboard', { contest_id: contestId });
    });
    socket.on('disconnect', () => setLive(false));

    const applyPresence = (p: ContestPresenceDto, serverTime: number, announce: boolean) => {
      skewRef.current = serverTime - Date.now();
      const sinceLocal = p.since - skewRef.current;
      const prevState = tilesRef.current.get(p.student_id)?.state ?? 'unknown';
      upsertTile(p.student_id, (old) => {
        const base = old ?? blank(p.student_id, p.username, p.full_name);
        return {
          ...base,
          username: p.username,
          full_name: p.full_name ?? base.full_name,
          state: p.state,
          since: sinceLocal,
          problem_id: p.problem_id ?? base.problem_id,
        };
      });
      if (announce && prevState !== p.state) {
        const kind: FeedKind | null =
          p.state === 'away' ? 'away'
            : p.state === 'offline' ? 'offline'
              : prevState === 'away' ? 'back'
                : 'online';
        pushFeed({ kind, student_id: p.student_id, name: p.full_name || p.username, at: sinceLocal, problem_id: p.problem_id });
      }
    };

    socket.on('contest_presence_snapshot', (payload: { contest_id: string; server_time: number; students: ContestPresenceDto[] }) => {
      if (payload?.contest_id !== contestId) return;
      payload.students.forEach((p) => applyPresence(p, payload.server_time, false));
    });
    socket.on('contest_presence_update', (payload: ContestPresenceDto & { contest_id: string; server_time: number }) => {
      if (payload?.contest_id !== contestId) return;
      applyPresence(payload, payload.server_time, true);
    });
    // Vi phạm mới / được cấp lại quyền (sự kiện này cũng dùng cho bài nộp → chỉ lấy payload cảnh báo)
    socket.on(
      'admin_contest_update',
      (payload: {
        student_id?: string;
        username?: string;
        cheat_warnings?: number;
        is_disqualified?: boolean;
        reason?: string;
        problem_id?: string | null;
        at?: string;
      }) => {
        if (!payload?.student_id || typeof payload.cheat_warnings !== 'number') return;
        const at = payload.at ? new Date(payload.at).getTime() : Date.now();
        const isReset = payload.cheat_warnings <= 0 && !payload.is_disqualified;
        const prev = tilesRef.current.get(payload.student_id) ?? blank(payload.student_id, payload.username ?? payload.student_id);
        const name = prev.full_name || prev.username;
        upsertTile(payload.student_id, () => ({
          ...prev,
          cheat_warnings: payload.cheat_warnings!,
          is_disqualified: !!payload.is_disqualified,
          last_violation: isReset ? null : { reason: payload.reason ?? 'OTHER', at: payload.at ?? new Date(at).toISOString() },
          problem_id: payload.problem_id ?? prev.problem_id,
          flashAt: isReset ? prev.flashAt : Date.now(),
        }));
        if (isReset) {
          pushFeed({ kind: 'reset', student_id: prev.student_id, name, at });
        } else {
          pushFeed({
            kind: payload.is_disqualified && !prev.is_disqualified ? 'disqualified' : 'violation',
            student_id: prev.student_id,
            name,
            at,
            reason: payload.reason,
            problem_id: payload.problem_id,
            warnings: payload.cheat_warnings,
          });
          if (soundRef.current) beep();
        }
      },
    );
    return () => {
      setLive(false);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId, status]);

  // Esc để đóng
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggleSound = () => {
    setSound((v) => {
      try {
        localStorage.setItem('jh-monitor-sound', v ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !v;
    });
  };

  const handleReset = async (studentId: string) => {
    setResetting(studentId);
    try {
      await resetContestSession(contestId, studentId);
      upsertTile(studentId, (old) => ({
        ...(old ?? blank(studentId, studentId)),
        cheat_warnings: 0,
        is_disqualified: false,
        last_violation: null,
      }));
      notifyGlobalToast(t('contestMonitor.resetSuccess'), 'success');
    } catch (err) {
      notifyGlobalToast(err instanceof ApiError ? err.message : t('contestMonitor.resetFailed'));
    } finally {
      setResetting(null);
    }
  };

  const list = useMemo(() => [...tiles.values()], [tiles]);
  const counts = useMemo(
    () => ({
      active: list.filter((x) => x.state === 'active' && !x.is_disqualified).length,
      away: list.filter((x) => x.state === 'away' && !x.is_disqualified).length,
      offline: list.filter((x) => x.state === 'offline' && !x.is_disqualified).length,
      disq: list.filter((x) => x.is_disqualified).length,
      violators: list.filter((x) => x.cheat_warnings > 0).length,
      total: list.length,
    }),
    [list],
  );

  const rank = (x: StudentTile) =>
    x.is_disqualified ? 0 : x.state === 'away' ? 1 : x.cheat_warnings > 0 ? 2 : x.state === 'offline' ? 3 : x.state === 'active' ? 4 : 5;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list
      .filter((x) => {
        if (q && !`${x.full_name ?? ''} ${x.username}`.toLowerCase().includes(q)) return false;
        if (filter === 'attention') return x.is_disqualified || x.state === 'away' || x.cheat_warnings > 0;
        if (filter === 'away') return x.state === 'away';
        if (filter === 'offline') return x.state === 'offline';
        return true;
      })
      .sort((a, b) => rank(a) - rank(b) || b.cheat_warnings - a.cheat_warnings || a.username.localeCompare(b.username));
  }, [list, filter, query]);

  const visibleFeed = selected ? feed.filter((f) => f.student_id === selected) : feed;
  const selectedTile = selected ? tiles.get(selected) : undefined;

  if (typeof document === 'undefined') return null;

  const statusLine =
    status === 'upcoming'
      ? t('contestMonitor.notStarted')
      : status === 'ended'
        ? t('contestMonitor.ended')
        : live
          ? t('contestMonitor.live')
          : t('contestMonitor.connecting');

  return createPortal(
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-90 flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="monitor-title"
        className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-2xl w-full max-w-7xl h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-(--ws-border)">
          <div className="min-w-0 flex-1">
            <h3 id="monitor-title" className="text-lg font-bold flex items-center gap-2 truncate">
              <ShieldAlert size={20} className="text-(--ws-warn) shrink-0" aria-hidden="true" />
              {t('contestMonitor.title')}
              {contestTitle && <span className="font-medium text-(--ws-muted) truncate">· {contestTitle}</span>}
            </h3>
            <p className="text-xs text-(--ws-muted) mt-1 flex items-center gap-1.5">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  status === 'running' && live ? 'bg-(--ws-ok) animate-pulse' : status === 'upcoming' ? 'bg-(--ws-warn)' : 'bg-(--ws-faint)'
                }`}
                aria-hidden="true"
              />
              {statusLine}
              <span aria-hidden="true">·</span>
              {t('contestMonitor.maxWarnings', { max: maxWarnings })}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={sound}
            className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-lg border border-(--ws-border) text-xs font-semibold text-(--ws-muted) hover:text-(--ws-text) hover:bg-(--ws-hover)"
          >
            {sound ? <Volume2 size={14} aria-hidden="true" /> : <VolumeX size={14} aria-hidden="true" />}
            {sound ? t('contestMonitor.soundOn') : t('contestMonitor.soundOff')}
          </button>
          <button type="button" onClick={onClose} aria-label={t('contestMonitor.close')} className="p-2 rounded-lg text-(--ws-muted) hover:text-(--ws-text) hover:bg-(--ws-hover)">
            <X size={20} />
          </button>
        </div>

        {/* Counters + filters */}
        <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-(--ws-border-soft)">
          {(
            [
              ['all', t('contestMonitor.filterAll', { count: counts.total }), ''],
              ['attention', t('contestMonitor.filterAttention', { count: counts.violators + counts.away }), 'text-(--ws-danger)'],
              ['away', t('contestMonitor.filterAway', { count: counts.away }), 'text-(--ws-warn)'],
              ['offline', t('contestMonitor.filterOffline', { count: counts.offline }), 'text-(--ws-muted)'],
            ] as [Filter, string, string][]
          ).map(([key, label, tone]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`min-h-9 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                filter === key
                  ? 'bg-(--ws-accent) text-(--ws-panel) border-(--ws-accent)'
                  : `border-(--ws-border) hover:bg-(--ws-hover) ${tone || 'text-(--ws-text)'}`
              }`}
            >
              {label}
            </button>
          ))}
          <div className="flex items-center gap-3 ml-2 text-xs text-(--ws-muted)" aria-live="polite">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-(--ws-ok)" />{t('contestMonitor.stActive')} {counts.active}</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-(--ws-warn)" />{t('contestMonitor.stAway')} {counts.away}</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-(--ws-faint)" />{t('contestMonitor.stOffline')} {counts.offline}</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-(--ws-danger)" />{t('contestMonitor.stDisq')} {counts.disq}</span>
          </div>
          <div className="flex-1" />
          <label className="relative">
            <span className="sr-only">{t('contestMonitor.search')}</span>
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-(--ws-faint)" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('contestMonitor.search')}
              className="min-h-9 w-52 pl-8 pr-3 rounded-lg bg-(--ws-panel2) border border-(--ws-border) text-sm outline-none focus:border-(--ws-accent)"
            />
          </label>
        </div>

        <div className="flex-1 min-h-0 flex">
          {/* Grid */}
          <div className="flex-1 min-w-0 overflow-y-auto p-5">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-(--ws-muted)">
                <Loader2 size={26} className="animate-spin" aria-hidden="true" />
              </div>
            ) : visible.length === 0 ? (
              <div className="rounded-xl border border-(--ws-border) bg-(--ws-panel2) p-10 text-center text-sm text-(--ws-muted)">
                {counts.total === 0 ? t('contestMonitor.emptyNoOne') : t('contestMonitor.emptyFilter')}
              </div>
            ) : (
              <ul className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
                {visible.map((s) => {
                  const st: LiveState | 'disq' = s.is_disqualified ? 'disq' : s.state;
                  const tone =
                    st === 'disq'
                      ? 'border-(--ws-danger) bg-(--ws-verdict-wa-bg)'
                      : st === 'away'
                        ? 'border-(--ws-warn) bg-(--ws-verdict-tle-bg)'
                        : st === 'active'
                          ? 'border-(--ws-border) bg-(--ws-panel)'
                          : 'border-(--ws-border) bg-(--ws-panel) opacity-70';
                  const flashing = now - s.flashAt < 3000;
                  const pct = Math.min(100, (s.cheat_warnings / Math.max(1, maxWarnings)) * 100);
                  return (
                    <li key={s.student_id}>
                      <button
                        type="button"
                        onClick={() => setSelected((v) => (v === s.student_id ? null : s.student_id))}
                        aria-pressed={selected === s.student_id}
                        className={`w-full text-left rounded-xl border-2 p-3.5 transition-shadow hover:shadow-md ${tone} ${
                          selected === s.student_id ? 'ring-2 ring-(--ws-accent) ring-offset-1 ring-offset-(--ws-panel)' : ''
                        } ${flashing ? 'jh-monitor-flash' : ''}`}
                      >
                        <div className="text-sm font-semibold truncate" title={s.full_name || s.username}>{s.full_name || s.username}</div>
                        <div className="text-[11.5px] text-(--ws-muted) truncate">@{s.username}</div>
                        <div className="mt-2">
                          <StatePill state={st} since={s.since} now={now} t={t} />
                        </div>
                        <div className="mt-2.5 text-[12px] text-(--ws-muted) truncate">
                          {s.problem_id ? (problemNames[s.problem_id] ?? t('contestMonitor.problemUnknown')) : t('contestMonitor.noProblem')}
                        </div>
                        <div className="mt-2.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded bg-(--ws-border-soft)" aria-hidden="true">
                            <div
                              className={`h-full rounded ${s.is_disqualified || s.cheat_warnings >= maxWarnings ? 'bg-(--ws-danger)' : s.cheat_warnings > 0 ? 'bg-(--ws-warn)' : 'bg-(--ws-ok)'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11.5px] font-semibold">
                            {t('contestMonitor.warnings', { count: s.cheat_warnings, max: maxWarnings })}
                          </span>
                        </div>
                        {s.last_violation && (
                          <div className="mt-2 text-[11.5px] text-(--ws-danger) truncate">
                            {reasonLabel(s.last_violation.reason)} · {clock(new Date(s.last_violation.at).getTime())}
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Feed */}
          <aside className="w-80 shrink-0 border-l border-(--ws-border) flex flex-col bg-(--ws-panel2)/40" aria-labelledby="feed-title">
            <div className="px-4 py-3 border-b border-(--ws-border-soft)">
              <div className="flex items-center justify-between gap-2">
                <h4 id="feed-title" className="text-sm font-bold">{t('contestMonitor.feedTitle')}</h4>
                {selected && (
                  <button type="button" onClick={() => setSelected(null)} className="text-[11.5px] font-semibold text-(--ws-accent) hover:underline">
                    {t('contestMonitor.feedShowAll')}
                  </button>
                )}
              </div>
              {selectedTile && (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[12px] text-(--ws-muted) truncate">
                    {t('contestMonitor.feedOf', { name: selectedTile.full_name || selectedTile.username })}
                  </span>
                  {(selectedTile.is_disqualified || selectedTile.cheat_warnings > 0) && status !== 'ended' && (
                    <button
                      type="button"
                      onClick={() => handleReset(selectedTile.student_id)}
                      disabled={resetting === selectedTile.student_id}
                      className="shrink-0 inline-flex items-center gap-1 min-h-8 px-2.5 rounded-lg bg-(--ws-accent) text-(--ws-panel) text-[11.5px] font-semibold disabled:opacity-60"
                    >
                      {resetting === selectedTile.student_id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                      {t('contestMonitor.resetBtn')}
                    </button>
                  )}
                </div>
              )}
            </div>
            <ol className="flex-1 overflow-y-auto px-2 py-2" aria-live="polite">
              {visibleFeed.length === 0 ? (
                <li className="px-2 py-6 text-center text-[12px] text-(--ws-muted)">{t('contestMonitor.feedEmpty')}</li>
              ) : (
                visibleFeed.map((f) => <FeedRow key={f.id} item={f} t={t} reasonLabel={reasonLabel} problemNames={problemNames} />)
              )}
            </ol>
          </aside>
        </div>
      </div>
    </div>,
    document.body,
  );
}

type TFn = ReturnType<typeof useTranslation>['t'];

function StatePill({ state, since, now, t }: { state: LiveState | 'disq'; since: number | null; now: number; t: TFn }) {
  const base = 'shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap';
  if (state === 'disq')
    return <span className={`${base} bg-(--ws-danger) text-white`}><Ban size={11} aria-hidden="true" />{t('contestMonitor.stDisq')}</span>;
  if (state === 'away')
    return (
      <span className={`${base} bg-(--ws-warn) text-[#1b1b1b]`}>
        <EyeOff size={11} aria-hidden="true" />
        {t('contestMonitor.stAway')} {since ? formatDuration(now - since) : ''}
      </span>
    );
  if (state === 'active')
    return <span className={`${base} bg-(--ws-verdict-ac-bg) text-(--ws-verdict-ac-fg)`}><Eye size={11} aria-hidden="true" />{t('contestMonitor.stActive')}</span>;
  if (state === 'offline')
    return <span className={`${base} bg-(--ws-panel2) text-(--ws-muted)`}><WifiOff size={11} aria-hidden="true" />{t('contestMonitor.stOffline')}</span>;
  return <span className={`${base} bg-(--ws-panel2) text-(--ws-faint)`}>{t('contestMonitor.stUnknown')}</span>;
}

function FeedRow({
  item,
  t,
  reasonLabel,
  problemNames,
}: {
  item: FeedItem;
  t: TFn;
  reasonLabel: (r?: string) => string;
  problemNames: Record<string, string>;
}) {
  const dot: Record<FeedKind, string> = {
    violation: 'bg-(--ws-danger)',
    disqualified: 'bg-(--ws-danger)',
    away: 'bg-(--ws-warn)',
    back: 'bg-(--ws-ok)',
    online: 'bg-(--ws-ok)',
    offline: 'bg-(--ws-faint)',
    reset: 'bg-(--ws-accent)',
  };
  const text =
    item.kind === 'violation'
      ? t('contestMonitor.evViolation', { reason: reasonLabel(item.reason), count: item.warnings ?? 0 })
      : item.kind === 'disqualified'
        ? t('contestMonitor.evDisqualified', { reason: reasonLabel(item.reason) })
        : t(`contestMonitor.ev_${item.kind}`);
  return (
    <li className="flex gap-2.5 px-2 py-2 rounded-lg hover:bg-(--ws-hover)">
      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dot[item.kind]}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] leading-5">
          <span className="font-semibold">{item.name}</span>{' '}
          <span className={item.kind === 'violation' || item.kind === 'disqualified' ? 'text-(--ws-danger)' : 'text-(--ws-muted)'}>{text}</span>
        </div>
        <div className="text-[11px] text-(--ws-faint) font-mono">
          {clock(item.at)}
          {item.problem_id && problemNames[item.problem_id] ? ` · ${problemNames[item.problem_id]}` : ''}
        </div>
      </div>
    </li>
  );
}
