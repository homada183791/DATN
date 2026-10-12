import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { useQueryClient } from '@tanstack/react-query';
import { getDetail, LANG_LABELS, Lang, ProblemDetail } from '../../data/problemDetails';
import { ApiError, apiFetch } from '../../api/http';
import { useProblemQuery } from '../../api/problems';
import { useProblemSubmissionsQuery, type SubmissionDto } from '../../api/submissions';
import {
  SUPPORTED_LANGUAGES,
  getAllowedLanguagesList,
  getLanguageConfig,
  mapVersionToApi,
  LanguageVersionConfig,
} from '../../config/languages';

function highlightCode(raw: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let out = esc(raw || '');
  out = out.replace(/(\/\/[^\n]*|#[^\n]*)/g, '<span class="text-[#6a9955]">$1</span>');
  out = out.replace(/("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')/g, '<span class="text-[#ce9178]">$1</span>');
  const kw = /\b(def|class|return|if|else|elif|for|while|import|from|in|include|int|float|double|char|void|bool|auto|vector|string|public|private|static|const|namespace|using|try|catch|new|throw|package|func|var|let)\b/g;
  out = out.replace(kw, '<span class="text-[#569cd6] font-semibold">$1</span>');
  return out;
}
import { formatVNFull } from '../../utils/dateTime';
import { joinContest } from '../../api/contests';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { type Socket } from 'socket.io-client';
import { createSocket } from '../../api/socket';
import {
  HelpCircle,
  Send,
  Eye,
  Columns,
  FileText,
  Code,
  Download,
  Play,
  Copy,
  RotateCcw,
  Upload,
  ClipboardPaste,
  RefreshCw,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Terminal,
  Bug,
  FlaskConical,
  Loader2,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  ShieldAlert,
  Monitor,
  Lock,
} from 'lucide-react';
import { getLocalizedProblemTitle, getLocalizedProblemDescription } from '../../utils/problemTranslation';
import { getAiTutorHint, explainSubmissionError } from '../../api/ai';

/* ---------------- allowed contest resources ---------------- */

const ALLOWED_RESOURCES = [
  {
    id: 'cpp_stl',
    title: 'C++ Standard Template Library (STL)',
    lang: 'C++',
    content: `### C++ STL Reference
**1. vector (Mảng động)**
\`\`\`cpp
#include <vector>
vector<int> a = {1, 2, 3};
a.push_back(4);
a.pop_back();
int n = a.size();
sort(a.begin(), a.end()); // Tăng dần
sort(a.rbegin(), a.rend()); // Giảm dần
\`\`\`

**2. map / unordered_map (Bảng băm & Cây đỏ đen)**
\`\`\`cpp
#include <map>
#include <unordered_map>
unordered_map<string, int> freq; // O(1) trung bình
freq["apple"]++;
if (freq.count("apple")) { /* tồn tại */ }
\`\`\`

**3. priority_queue (Hàng đợi ưu tiên / Max Heap)**
\`\`\`cpp
#include <queue>
priority_queue<int> maxHeap; // Phần tử lớn nhất ở đỉnh
priority_queue<int, vector<int>, greater<int>> minHeap; // Phần tử nhỏ nhất ở đỉnh
minHeap.push(10);
int top = minHeap.top(); minHeap.pop();
\`\`\`

**4. Binary Search (Tìm kiếm nhị phân)**
\`\`\`cpp
#include <algorithm>
// Mảng hoặc vector phải được sắp xếp trước
auto it = lower_bound(a.begin(), a.end(), x); // Phần tử đầu tiên >= x
auto it2 = upper_bound(a.begin(), a.end(), x); // Phần tử đầu tiên > x
\`\`\`

**5. Fast I/O**
\`\`\`cpp
ios_base::sync_with_stdio(false);
cin.tie(NULL);
\`\`\`
`,
  },
  {
    id: 'py_std',
    title: 'Python 3 Standard Library',
    lang: 'Python',
    content: `### Python 3 Quick Reference
**1. Fast Input & Output**
\`\`\`python
import sys
input = sys.stdin.readline
# Đọc dòng số nguyên:
nums = list(map(int, input().split()))
\`\`\`

**2. collections (Counter, deque, defaultdict)**
\`\`\`python
from collections import Counter, deque, defaultdict
cnt = Counter([1, 2, 2, 3]) # đếm tần suất
q = deque([1, 2])
q.append(3); q.appendleft(0)
x = q.popleft(); y = q.pop()

graph = defaultdict(list)
graph[u].append(v)
\`\`\`

**3. heapq (Min Heap)**
\`\`\`python
import heapq
h = []
heapq.heappush(h, 5)
heapq.heappush(h, 2)
val = heapq.heappop(h) # trả về 2 (nhỏ nhất)
\`\`\`

**4. bisect (Binary Search)**
\`\`\`python
import bisect
idx = bisect.bisect_left(arr, x)  # tương đương lower_bound
idx2 = bisect.bisect_right(arr, x) # tương đương upper_bound
\`\`\`
`,
  },
  {
    id: 'complexity',
    title: 'Bảng độ phức tạp & Giới hạn thời gian (Time Limits)',
    lang: 'Chung',
    content: `### Quy tắc ước lượng độ phức tạp thuật toán (1 giây ~ 10^8 phép tính)
| Kích thước N | Độ phức tạp mong muốn | Thuật toán thường gặp |
|---|---|---|
| N ≤ 10–12 | O(N!) | Quay lui hoán vị, vét cạn |
| N ≤ 20–25 | O(2^N) | Quay lui tập con, Bitmask DP |
| N ≤ 100 | O(N^4) hoặc O(N^3) | Floyd-Warshall, Matrix DP |
| N ≤ 500 | O(N^3) | Nhân ma trận, DP 3 chiều |
| N ≤ 2,000 | O(N^2) | 2 vòng lặp lồng, DP 2 chiều |
| N ≤ 100,000 | O(N log N) | Sắp xếp, Segment Tree, Binary Search |
| N ≤ 10,000,000 | O(N) | Two Pointers, Prefix Sum, Hash Map |
| N rất lớn (10^9) | O(log N) hoặc O(1) | Tìm kiếm nhị phân, Công thức toán học |
`,
  },
];

/* ---------------- types ---------------- */

type LayoutMode = 'split' | 'statement' | 'editor';
type LeftTab = 'statement' | 'submissions' | 'ai_tutor' | 'resources';
type BottomTab = 'tests' | 'console' | 'results' | 'debug';
interface ConsoleLine { time: string; msg: string; kind: 'info' | 'ok' | 'err' | 'sys' }
interface TestVerdict { id: number; status: 'AC' | 'WA' | 'TLE'; time: number; memory: number }
interface AssistantMessage { id: number; role: 'user' | 'assistant'; content: string }
interface SubmissionStatusPayload {
  submission_id: string;
  status: string;
  execution_time?: number | null;
  memory_used?: number | null;
}

const now = () => new Date().toLocaleTimeString('en-GB', { hour12: false });
const MIN_BOTTOM_PANEL_HEIGHT = 44;
const DEFAULT_BOTTOM_PANEL_HEIGHT = 256;
const COLLAPSED_BOTTOM_PANEL_HEIGHT = 48;
const BOTTOM_RESIZE_HANDLE_HEIGHT = 6;

export default function ProblemSolve() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'vi';
  // Hỗ trợ các URL pattern:
  // - /student/problem/:id  (cũ)
  // - /student/class/:classId/homework/:homeworkId/problem/:problemId  (homework)
  // - /student/contest/:contestId/problem/:problemId  (kỳ thi trực tiếp)
  const { id, problemId: pid, classId, homeworkId, contestId: cid } = useParams<{
    id?: string;
    problemId?: string;
    classId?: string;
    homeworkId?: string;
    contestId?: string;
  }>();
  const [searchParams] = useSearchParams();
  const contestId = cid || searchParams.get('contestId') || undefined;
  const { user } = useAuth();

  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [isFullscreenLock, setIsFullscreenLock] = useState(false);
  const lastCheatReportTime = useRef(0);
  const reportCheatRef = useRef<((reason: string) => Promise<void>) | null>(null);

  /* AI Tutor state */
  const [aiTutorHintType, setAiTutorHintType] = useState<'HINT' | 'COMPLEXITY' | 'EDGE_CASE' | 'EXPLAIN_LOGIC'>('HINT');
  const [aiTutorLoading, setAiTutorLoading] = useState(false);
  const [aiTutorResponse, setAiTutorResponse] = useState<string | null>(null);

  const resolvedId = pid ?? id;
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: apiProblem, isLoading, error } = useProblemQuery(resolvedId);

  const problemId = apiProblem?.id ?? resolvedId ?? 'unknown-problem';
  const problemTitle = apiProblem?.title ?? t('problemSolve.fallbackProblemTitle');
  const problemDifficulty = apiProblem?.difficulty ?? 'MEDIUM';
  const problemDescription = apiProblem?.description ?? '';

  const localizedTitle = useMemo(
    () => getLocalizedProblemTitle(problemTitle, currentLang),
    [problemTitle, currentLang],
  );
  const localizedDescription = useMemo(
    () => getLocalizedProblemDescription(problemDescription, currentLang),
    [problemDescription, currentLang],
  );

  const problemPoints = useMemo(() => {
    if (problemDifficulty === 'EASY') return 100;
    if (problemDifficulty === 'HARD') return 300;
    return 200;
  }, [problemDifficulty]);

  const detail: ProblemDetail = useMemo(
    () => getDetail(problemId, localizedTitle, problemPoints),
    [problemId, localizedTitle, problemPoints],
  );

  const problemTimeLimit = apiProblem?.time_limit ? `${apiProblem.time_limit} ms` : detail.timeLimit;
  const problemMemoryLimit = apiProblem?.memory_limit ? `${apiProblem.memory_limit} MB` : detail.memoryLimit;

  const getInitialSamples = useCallback(() => {
    if (apiProblem?.test_cases && apiProblem.test_cases.length > 0) {
      const visible = apiProblem.test_cases.filter((tc) => !tc.is_hidden);
      if (visible.length > 0) {
        return visible.map((tc, idx) => ({
          id: idx + 1,
          input: tc.input,
          output: tc.expected_output,
          explanation: '',
        }));
      }
    }
    return detail.samples.map((s) => ({ ...s }));
  }, [apiProblem?.test_cases, detail.samples]);

  /* ui state */
  const queryClient = useQueryClient();
  const [leftTab, setLeftTab] = useState<LeftTab>('statement');
  const [inspectedSubmission, setInspectedSubmission] = useState<SubmissionDto | null>(null);
  const {
    data: problemSubmissions = [],
    isLoading: isLoadingSubmissions,
    isFetching: isFetchingSubmissions,
  } = useProblemSubmissionsQuery(problemId);

  const allowedLangConfigs = useMemo(
    () => getAllowedLanguagesList(apiProblem?.allowed_languages),
    [apiProblem?.allowed_languages],
  );

  const [selectedLangId, setSelectedLangId] = useState<string>('CPP17');

  const currentLangConfig = useMemo(
    () => getLanguageConfig(selectedLangId),
    [selectedLangId],
  );

  // Tự động chuyển ngôn ngữ nếu ngôn ngữ hiện tại không nằm trong danh sách cho phép
  useEffect(() => {
    if (allowedLangConfigs.length > 0) {
      const isAllowed = allowedLangConfigs.some((l) => l.id === selectedLangId);
      if (!isAllowed) {
        setSelectedLangId(allowedLangConfigs[0].id);
      }
    }
  }, [allowedLangConfigs, selectedLangId]);

  const restoreCodeFromSubmission = (sub: SubmissionDto) => {
    setCode(sub.source_code);
    if (sub.language_version && allowedLangConfigs.some((l) => l.id === sub.language_version)) {
      setSelectedLangId(sub.language_version);
    } else {
      const subLang = sub.language?.toUpperCase();
      const matched = allowedLangConfigs.find((l) => l.category === subLang);
      if (matched) {
        setSelectedLangId(matched.id);
      }
    }
    showToast(t('problemSolve.restoredCodeToast', { id: sub.id.slice(0, 8) }), 'success');
  };

  const [layout, setLayout] = useState<LayoutMode>('split');
  const [mobilePane, setMobilePane] = useState<'statement' | 'editor'>('statement');
  const [showSolution, setShowSolution] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const hasDocument = typeof document !== 'undefined';

  /* editor state */
  const lang = (currentLangConfig.monacoLang || 'cpp') as Lang;
  const [code, setCode] = useState(() =>
    localStorage.getItem(`jh-code-${problemId}-${selectedLangId}`) ?? currentLangConfig.template
  );
  const [wrap, setWrap] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [intelli, setIntelli] = useState(true);
  const [saveState, setSaveState] = useState<'saved' | 'unsaved' | 'saving'>('saved');

  /* judge state */
  const [bottomTab, setBottomTab] = useState<BottomTab>('tests');
  const [bottomHeight, setBottomHeight] = useState(DEFAULT_BOTTOM_PANEL_HEIGHT);
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true);
  const codeAreaRef = useRef<HTMLDivElement>(null);
  const bottomPanelRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const stopResizeRef = useRef<(() => void) | null>(null);

  const startBottomResize = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const codeArea = codeAreaRef.current;
    const bottomPanel = bottomPanelRef.current;
    if (!codeArea || !bottomPanel) return;

    const codeAreaTop = codeArea.getBoundingClientRect().top;
    const panelBottom = bottomPanel.getBoundingClientRect().bottom;
    const maxHeight = Math.max(
      panelBottom - codeAreaTop - BOTTOM_RESIZE_HANDLE_HEIGHT,
      MIN_BOTTOM_PANEL_HEIGHT
    );

    resizingRef.current = { startY: e.clientY, startHeight: bottomHeight };
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    function onMouseMove(event: MouseEvent) {
      const drag = resizingRef.current;
      if (!drag) return;
      const nextHeight = Math.min(
        Math.max(drag.startHeight + drag.startY - event.clientY, MIN_BOTTOM_PANEL_HEIGHT),
        maxHeight
      );
      setBottomHeight(nextHeight);
    }

    function stopResize() {
      resizingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      stopResizeRef.current = null;
    }

    function onMouseUp() {
      stopResize();
    }

    stopResizeRef.current = stopResize;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [bottomHeight]);

  useEffect(() => () => {
    stopResizeRef.current?.();
  }, []);

  const [samples, setSamples] = useState(() => getInitialSamples());
  const [sampleOutputs, setSampleOutputs] = useState<Record<number, { actual: string; ok: boolean; time?: number }>>({});
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [running, setRunning] = useState(false);
  const [judging, setJudging] = useState(false);
  const [judgeProgress, setJudgeProgress] = useState(0);
  const [testVerdicts, setTestVerdicts] = useState<TestVerdict[]>([]);
  const [finalVerdict, setFinalVerdict] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showAssistantMobile, setShowAssistantMobile] = useState(false);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      id: 1,
      role: 'assistant',
      content: t('problemSolve.assistantWelcome', { title: problemTitle }),
    },
  ]);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number | null>(null);
  const submissionSocketRef = useRef<Socket | null>(null);
  const customRunSocketRef = useRef<Socket | null>(null);

  useEffect(() => {
    return () => {
      submissionSocketRef.current?.disconnect();
      submissionSocketRef.current = null;
      customRunSocketRef.current?.disconnect();
      customRunSocketRef.current = null;
    };
  }, []);

  // ── Kiểm tra trạng thái kỳ thi / phòng thi khi mở bài ───────────────────────
  useEffect(() => {
    if (!contestId || user?.role !== 'student') return;

    joinContest(contestId)
      .then((res) => {
        if (res.cheat_warnings !== undefined) setCheatWarnings(res.cheat_warnings);
        if (res.is_disqualified) {
          setIsDisqualified(true);
        }
      })
      .catch((err) => {
        console.error('Không thể kiểm tra trạng thái phòng thi:', err);
      });
  }, [contestId, user?.role]);

  const toggleFullscreenLock = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreenLock(true);
        showToast('Đã kích hoạt chế độ toàn màn hình F11 (Phòng thi giám sát)!', 'success');
      } else {
        await document.exitFullscreen();
        setIsFullscreenLock(false);
      }
    } catch {
      showToast('Trình duyệt chặn toàn màn hình. Vui lòng cho phép quyền toàn màn hình.', 'error');
    }
  };

  const requestAiHint = async (type: 'HINT' | 'COMPLEXITY' | 'EDGE_CASE' | 'EXPLAIN_LOGIC' = 'HINT') => {
    if (contestId) {
      showToast('AI Tutor bị vô hiệu hóa trong phòng thi để đảm bảo tính công bằng!', 'error');
      return;
    }
    setAiTutorLoading(true);
    setAiTutorHintType(type);
    try {
      const apiLang = mapVersionToApi(selectedLangId);
      const res = await getAiTutorHint({
        problem_id: problemId,
        current_code: code,
        language: apiLang.language as any,
        hint_type: type,
        contest_id: contestId,
      });
      setAiTutorResponse(res.response);
    } catch (e: any) {
      showToast(e.message || 'Không thể lấy gợi ý từ AI.', 'error');
    } finally {
      setAiTutorLoading(false);
    }
  };

  const requestExplainError = async (submissionId: string) => {
    setAiTutorLoading(true);
    setLeftTab('ai_tutor');
    try {
      const res = await explainSubmissionError({ submission_id: submissionId });
      setAiTutorResponse(`### 🔍 Phân tích lỗi bài nộp (#${submissionId.slice(0, 8)} - ${res.status})\n\n${res.analysis}`);
    } catch (e: any) {
      showToast(e.message || 'Không thể phân tích lỗi bài nộp.', 'error');
    } finally {
      setAiTutorLoading(false);
    }
  };

  // ── Anti-cheat monitoring khi đang làm bài trong phòng thi ─────────────────────
  useEffect(() => {
    if (!contestId || user?.role !== 'student' || isDisqualified) return;

    const reportCheat = async (reason: string) => {
      const currentTime = Date.now();
      if (currentTime - lastCheatReportTime.current < 4000) return;
      lastCheatReportTime.current = currentTime;

      try {
        const res = await apiFetch<{
          success: boolean;
          cheat_warnings: number;
          is_disqualified: boolean;
        }>(`/api/v1/contests/${contestId}/anti-cheat/warning`, {
          method: 'POST',
        });

        setCheatWarnings(res.cheat_warnings);
        if (res.is_disqualified) {
          setIsDisqualified(true);
          showToast(t('problemSolve.disqualifiedToast'), 'error');
        } else {
          showToast(t('problemSolve.cheatWarningToast', { reason, count: res.cheat_warnings }), 'error');
        }
      } catch (err: any) {
        console.error('Không thể gửi cảnh báo gian lận:', err);
      }
    };
    reportCheatRef.current = reportCheat;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        reportCheat(t('problemSolve.cheatReasonTabSwitch'));
      }
    };

    const handleBlur = () => {
      reportCheat(t('problemSolve.cheatReasonBlur'));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Chặn các phím chức năng F1 đến F12
      if (/^F([1-9]|1[0-2])$/.test(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        showToast('Các phím chức năng F1–F12 bị vô hiệu hóa trong phòng thi!', 'error');
        return false;
      }
      // Chặn Alt (Alt+Tab, Alt+F4) và các phím tắt devtools/view-source
      if (e.altKey || (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S' || e.key === 'i' || e.key === 'I'))) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreenLock(isNowFullscreen);
      if (!isNowFullscreen && isFullscreenLock) {
        reportCheatRef.current?.('Thoát chế độ toàn màn hình F11');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [contestId, user?.role, isDisqualified, showToast, isFullscreenLock]);

  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownSeconds(0);
      return;
    }

    const updateCooldown = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownSeconds(remaining);
      if (remaining === 0) {
        setCooldownUntil(0);
      }
    };

    updateCooldown();
    const timer = window.setInterval(updateCooldown, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  /* load code when problem/lang changes */
  useEffect(() => {
    const saved = localStorage.getItem(`jh-code-${problemId}-${selectedLangId}`);
    setCode(saved ?? currentLangConfig.template);
    setSaveState(saved ? 'saved' : 'unsaved');
    setTestVerdicts([]);
    setFinalVerdict(null);
    setConsoleLines([]);
    setSamples(getInitialSamples());
    setSampleOutputs({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId, selectedLangId, currentLangConfig, getInitialSamples]);

  useEffect(() => {
    setSamples(getInitialSamples());
  }, [getInitialSamples]);

  useEffect(() => {
    setAssistantMessages([
      {
        id: Date.now(),
        role: 'assistant',
        content: t('problemSolve.assistantWelcome', { title: problemTitle }),
      },
    ]);
    setShowAssistant(false);
    setShowAssistantMobile(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId, problemTitle]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [assistantMessages, showAssistant]);

  const pushConsole = useCallback((msg: string, kind: ConsoleLine['kind'] = 'info') => {
    setConsoleLines((prev) => [...prev, { time: now(), msg, kind }]);
  }, []);

  const onCodeChange = (v: string) => {
    setCode(v);
    setSaveState('unsaved');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      setSaveState('saving');
      localStorage.setItem(`jh-code-${problemId}-${selectedLangId}`, v);
      window.setTimeout(() => setSaveState('saved'), 350);
    }, 700);
  };

  const syncScroll = () => {
    const ta = taRef.current;
    if (!ta) return;
    if (preRef.current) {
      preRef.current.scrollTop = ta.scrollTop;
      preRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const { selectionStart: s, selectionEnd: en } = ta;
      const next = code.slice(0, s) + '    ' + code.slice(en);
      onCodeChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = s + 4;
      });
    }
  };

  /* -------- real custom run via API + Socket -------- */
  const LANG_API: Record<Lang, string> = { cpp: 'CPP', python: 'PYTHON', java: 'JAVA' };

  const runOneSample = (
    socket: Socket,
    sessionId: string,
  ): Promise<{ output: string; time?: number; ok: boolean }> =>
    new Promise((resolve) => {
      const timeout = window.setTimeout(() => {
        resolve({ output: '(timeout)', time: undefined, ok: false });
      }, 30_000);
      const handler = (payload: { session_id: string; stdout?: string; output?: string; stderr?: string; execution_time?: number; status?: string }) => {
        if (payload.session_id !== sessionId) return;
        window.clearTimeout(timeout);
        socket.off('custom_run_result', handler);
        // webhook emits 'stdout', fallback to 'output' then 'stderr'
        const raw = (payload.stdout ?? payload.output ?? payload.stderr ?? '(no output)').trim();
        resolve({ output: raw, time: payload.execution_time ?? undefined, ok: payload.status === 'OK' || payload.status === 'ACCEPTED' });
      };
      socket.on('custom_run_result', handler);
    });

  const runSamples = async () => {
    if (code.trim().length < 10) {
      pushConsole(t('problemSolve.consoleEmptyCode'), 'err');
      return;
    }
    setRunning(true);
    setBottomTab('console');
    setConsoleLines([]);
    setSampleOutputs({});
    pushConsole(`$ run --lang ${currentLangConfig.name} (${currentLangConfig.compiler}) --samples ${samples.length}`, 'sys');

    customRunSocketRef.current?.disconnect();
    const socket = createSocket();
    customRunSocketRef.current = socket;

    // Wait for connection
    const connected = await new Promise<boolean>((res) => {
      socket.once('connect', () => res(true));
      socket.once('connect_error', () => res(false));
      setTimeout(() => res(false), 5000);
    });
    if (!connected) {
      pushConsole(t('problemSolve.consoleSocketConnectError'), 'err');
      setRunning(false);
      socket.disconnect();
      customRunSocketRef.current = null;
      return;
    }

    const newOutputs: Record<number, { actual: string; ok: boolean; time?: number }> = {};

    for (let i = 0; i < samples.length; i++) {
      pushConsole(t('problemSolve.consoleRunningSample', { current: i + 1, total: samples.length }), 'info');
      try {
        const apiLang = mapVersionToApi(selectedLangId);
        const resp = await apiFetch<{ success: boolean; session_id: string }>('/api/v1/submissions/run-custom', {
          method: 'POST',
          body: JSON.stringify({
            language: apiLang.language,
            language_version: apiLang.language_version,
            source_code: code,
            custom_input: samples[i].input,
          }),
        });
        socket.emit('join_custom_run', { session_id: resp.session_id });
        const result = await runOneSample(socket, resp.session_id);
        const expected = samples[i].output.trim();
        const isCorrect = result.output === expected;
        newOutputs[i] = { actual: result.output, ok: isCorrect, time: result.time };
        setSampleOutputs({ ...newOutputs });
        if (isCorrect) {
          pushConsole(`Test ${i + 1}: OK${result.time !== undefined ? ` (${result.time}ms)` : ''}`, 'ok');
        } else {
          pushConsole(`Test ${i + 1}: WRONG ANSWER`, 'err');
          pushConsole(`  Expected: ${expected.slice(0, 100)}${expected.length > 100 ? '…' : ''}`, 'info');
          pushConsole(`  Got:      ${result.output.slice(0, 100)}${result.output.length > 100 ? '…' : ''}`, 'err');
        }
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : t('problemSolve.unknownError');
        pushConsole(`Test ${i + 1}: ERROR — ${msg}`, 'err');
        newOutputs[i] = { actual: `ERROR: ${msg}`, ok: false };
        setSampleOutputs({ ...newOutputs });
      }
    }

    socket.disconnect();
    customRunSocketRef.current = null;
    setRunning(false);
    pushConsole(t('problemSolve.consoleRunSamplesDone'), 'sys');
  };

  const submit = async () => {
    if (isDisqualified) {
      showToast(t('problemSolve.disqualifiedSubmitToast'), 'error');
      return;
    }
    setJudging(true);
    setBottomTab('console');
    setConsoleLines([]);
    setFinalVerdict(null);
    setTestVerdicts([]);
    setJudgeProgress(0);
    pushConsole(`$ judge --submit ${detail.code} --lang ${currentLangConfig.name} (${currentLangConfig.compiler})`, 'sys');
    pushConsole(t('problemSolve.consoleSubmitting'), 'info');
    let submissionId: string;
    try {
      const apiLang = mapVersionToApi(selectedLangId);
      const response = await apiFetch<{ submission_id: string }>('/api/v1/submissions', {
        method: 'POST',
        body: JSON.stringify({
          problem_id: problemId,
          language: apiLang.language,
          language_version: apiLang.language_version,
          source_code: code,
          contest_id: contestId || undefined,
        }),
      });
      submissionId = response.submission_id;
      if (!submissionId) {
        throw new Error(t('problemSolve.submissionIdMissingError'));
      }
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        if (submitError.status === 429) {
          showToast(t('problemSolve.throttledToast'), 'error');
          setCooldownUntil(Date.now() + 60_000);
          pushConsole('error: throttled by server (429 Too Many Requests)', 'err');
        } else if (submitError.status === 403) {
          showToast(t('problemSolve.contestClosedToast'), 'error');
          pushConsole('error: deadline passed (403 Forbidden)', 'err');
        } else if (submitError.status === 409) {
          showToast(t('problemSolve.duplicateSubmissionToast'), 'error');
          pushConsole('error: conflict detected (409 Conflict)', 'err');
        } else {
          showToast(submitError.message || t('problemSolve.submitFailedToast'), 'error');
          pushConsole(t('problemSolve.consoleSubmitFailed'), 'err');
        }
      } else {
        showToast(t('problemSolve.submitFailedToast'), 'error');
        pushConsole(t('problemSolve.consoleSubmitFailed'), 'err');
      }
      setJudging(false);
      return;
    }

    const socket = createSocket();
    submissionSocketRef.current?.disconnect();
    submissionSocketRef.current = socket;

    const terminalVerdicts: Record<string, string> = {
      ACCEPTED: 'AC',
      WRONG_ANSWER: 'WA',
      TIME_LIMIT_EXCEEDED: 'TLE',
      COMPILE_ERROR: 'CE',
      RUNTIME_ERROR: 'RTE',
    };

    const watchdogTimer = window.setTimeout(() => {
      showToast(t('problemSolve.watchdogTimeoutToast'), 'error');
      pushConsole(t('problemSolve.consoleJudgeNoResponse'), 'err');
      setJudging(false);
      socket.disconnect();
      submissionSocketRef.current = null;
    }, 60000);

    socket.on('connect', () => {
      socket.emit('join_submission', { submission_id: submissionId });
      pushConsole(t('problemSolve.consoleSocketConnected', { id: submissionId.slice(0, 8) }), 'info');
    });

    socket.on('submission_status_changed', (payload: SubmissionStatusPayload) => {
      const status = payload.status.toUpperCase();
      const verdict = terminalVerdicts[status];
      setJudgeProgress(verdict ? 100 : status === 'IN_QUEUE' ? 35 : 15);
      pushConsole(t('problemSolve.consoleSubmissionStatus', { status }), verdict === 'AC' ? 'ok' : verdict ? 'err' : 'info');

      if (!verdict) return;

      queryClient.invalidateQueries({ queryKey: ['submissions', 'problem', problemId] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });

      window.clearTimeout(watchdogTimer);
      setFinalVerdict(verdict);
      setBottomTab('results');
      setJudging(false);
      socket.disconnect();
      submissionSocketRef.current = null;
    });

    socket.on('connect_error', (err) => {
      window.clearTimeout(watchdogTimer);
      showToast(t('problemSolve.judgeServerConnectError'), 'error');
      pushConsole(t('problemSolve.consoleSocketError', { message: err?.message || t('problemSolve.connectionErrorFallback') }), 'err');
      setJudging(false);
      socket.disconnect();
      submissionSocketRef.current = null;
    });
  };

  /* -------- misc actions -------- */
  const copyText = (text: string, btnId: string) => {
    navigator.clipboard?.writeText(text);
    const el = document.getElementById(btnId);
    if (el) {
      el.dataset.copied = '1';
      setTimeout(() => (el.dataset.copied = ''), 1200);
    }
  };

  const pasteIntoEditor = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onCodeChange(code + text);
    } catch {
      pushConsole(t('problemSolve.consoleClipboardError'), 'err');
    }
  };

  const uploadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      onCodeChange(String(reader.result ?? ''));
      const name = file.name.toLowerCase();
      let matched = allowedLangConfigs.find((l) => name.endsWith(l.extension));
      if (!matched) {
        if (name.endsWith('.cpp') || name.endsWith('.cc')) {
          matched = allowedLangConfigs.find((l) => l.category === 'CPP');
        } else if (name.endsWith('.py')) {
          matched = allowedLangConfigs.find((l) => l.category === 'PYTHON');
        } else if (name.endsWith('.java')) {
          matched = allowedLangConfigs.find((l) => l.category === 'JAVA');
        } else if (name.endsWith('.c')) {
          matched = allowedLangConfigs.find((l) => l.category === 'C');
        } else if (name.endsWith('.go')) {
          matched = allowedLangConfigs.find((l) => l.category === 'GO');
        } else if (name.endsWith('.js') || name.endsWith('.ts')) {
          matched = allowedLangConfigs.find((l) => l.category === 'NODE');
        }
      }
      if (matched) {
        setSelectedLangId(matched.id);
        showToast(`Đã nhận diện tệp mã nguồn: ${matched.name}`, 'info');
      }
    };
    reader.readAsText(file);
  };

  const downloadStatement = () => {
    const text = detail.sections
      .map((s) => `${s.heading ? `## ${s.heading}\n` : ''}${(s.paragraphs ?? []).join('\n')}${(s.bullets ?? []).map((b) => `\n- ${b}`).join('')}`)
      .join('\n\n');
    const markdown = problemDescription ? `${problemDescription}\n\n${text}` : text;
    const blob = new Blob([`# ${problemTitle} (${detail.code})\n\n${markdown}`], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${detail.code}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const getAssistantReply = (text: string) => {
    const input = text.toLowerCase();
    if (input.includes('gợi ý') || input.includes('hint') || input.includes('ý tưởng')) {
      return t('problemSolve.assistantHintReply', { title: problemTitle });
    }
    if (input.includes('độ phức tạp') || input.includes('complex')) {
      return t('problemSolve.assistantComplexityReply');
    }
    if (input.includes('code') || input.includes('viết') || input.includes('c++') || input.includes('python') || input.includes('java')) {
      return t('problemSolve.assistantCodeReply', { code: detail.code });
    }
    if (input.includes('đề bài') || input.includes('ý nghĩa')) {
      return t('problemSolve.assistantStatementReply', { title: problemTitle });
    }
    return t('problemSolve.assistantDefaultReply', { title: problemTitle });
  };

  const askAssistant = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = assistantInput.trim();
    if (!text) return;

    setAssistantMessages((prev) => [...prev, { id: Date.now(), role: 'user', content: text }]);
    setAssistantInput('');
    setAssistantBusy(true);

    window.setTimeout(() => {
      const reply = getAssistantReply(text);
      setAssistantMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', content: reply }]);
      setAssistantBusy(false);
    }, 450);
  };

  const solved = false;

  const lineCount = code.split('\n').length;
  const highlighted = useMemo(() => highlightCode(code), [code]);

  const diffChip =
    problemDifficulty === 'EASY'
      ? 'text-[var(--ws-ok)] bg-[color:var(--ws-accent-soft)]'
      : problemDifficulty === 'MEDIUM'
      ? 'text-[var(--ws-warn)] bg-[color:var(--ws-accent-soft)]'
      : 'text-[var(--ws-danger)] bg-[color:var(--ws-accent-soft)]';

  const isSubmitLocked = running || judging || cooldownSeconds > 0;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-(--ws-bg) text-(--ws-text)">
        <div className="w-full max-w-3xl px-6">
          <div className="h-5 w-44 rounded bg-(--ws-panel2) animate-pulse mb-4" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-112 rounded-2xl border border-(--ws-border) bg-(--ws-panel) animate-pulse" />
            <div className="h-112 rounded-2xl border border-(--ws-border) bg-(--ws-panel) animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-(--ws-bg) text-(--ws-text) px-6">
        <div className="max-w-lg w-full rounded-3xl border border-(--ws-border) bg-(--ws-panel) p-8 text-center shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-(--ws-faint)">404</p>
          <h1 className="mt-3 text-2xl font-bold">{t('problemSolve.notFoundTitle')}</h1>
          <p className="mt-3 text-sm text-(--ws-muted)">{t('problemSolve.notFoundSubtitle')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-(--ws-bg) text-(--ws-text) px-6">
        <div className="max-w-lg w-full rounded-3xl border border-(--ws-border) bg-(--ws-panel) p-8 text-center shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-(--ws-faint)">{t('problemSolve.loadErrorBadge')}</p>
          <h1 className="mt-3 text-2xl font-bold">{t('problemSolve.loadErrorHeading')}</h1>
          <p className="mt-3 text-sm text-(--ws-muted)">{t('problemSolve.tryAgainLater')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full text-(--ws-text)">
      {/* problem header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-(--ws-border) bg-(--ws-panel) flex-wrap">
          {/* Back button */}
          {classId && homeworkId ? (
            <button
              onClick={() => navigate(`/student/class/${classId}/homework/${homeworkId}`)}
              className="flex items-center gap-1 text-[12px] text-(--ws-muted) hover:text-(--ws-text) transition-colors mr-1"
              title={t('problemSolve.backToProblemsTitle')}
            >
              ← {t('problemSolve.backToProblems')}
            </button>
          ) : (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-[12px] text-(--ws-muted) hover:text-(--ws-text) transition-colors mr-1"
              title={t('problemSolve.backToListTitle')}
            >
              ← {t('studentContest.back')}
            </button>
          )}
          <span className="text-[11px] font-bold tracking-wider px-2.5 py-1 rounded-md bg-(--ws-accent-soft) text-(--ws-accent)">
            {detail.code}
          </span>
          <h1 className="text-[17px] font-bold">{localizedTitle}</h1>
          <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-md ${diffChip}`}>{problemDifficulty === 'EASY' ? t('problemForm.easy') : problemDifficulty === 'MEDIUM' ? t('problemForm.medium') : t('problemForm.hard')}</span>
          {contestId && (
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md border ${
                isDisqualified
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : cheatWarnings > 0
                  ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                  : 'bg-purple-100 text-purple-800 border-purple-200'
              }`}>
                🛡️ {isDisqualified ? t('problemSolve.cheatDisqualifiedBadge') : cheatWarnings > 0 ? t('problemSolve.cheatWarningBadge', { count: cheatWarnings }) : t('problemSolve.onlineExamBadge')}
              </span>
              <button
                onClick={toggleFullscreenLock}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                  isFullscreenLock
                    ? 'bg-purple-900/30 text-purple-200 border-purple-500 shadow-sm animate-pulse'
                    : 'bg-(--ws-panel2) text-(--ws-muted) border-(--ws-border) hover:border-purple-400 hover:text-(--ws-text)'
                }`}
                title="Chế độ toàn màn hình giám sát thi cử (F11 Lockdown)"
              >
                <Monitor size={12} />
                {isFullscreenLock ? '🔒 Đang khóa F11' : '🖥️ Bật F11 Lockdown'}
              </button>
            </div>
          )}
          {solved && (
            <span className="flex items-center gap-1 text-[12px] font-semibold text-(--ws-ok)">
              <CheckCircle2 size={14} /> {t('studentHomework.completed')}
            </span>
          )}
          <div className="flex-1" />
          <button
            onClick={() => setShowGuide(true)}
            className="p-2 rounded-lg border border-(--ws-border) text-(--ws-muted) hover:text-(--ws-accent) hover:border-(--ws-accent) transition-colors"
            title={t("problemSolve.usageGuide")}
          >
            <HelpCircle size={15} />
          </button>
          <button
            onClick={() => setShowSolution(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--ws-border) text-[12.5px] font-medium text-(--ws-muted) hover:text-(--ws-text) hover:border-(--ws-accent) transition-colors"
          >
            <Eye size={14} /> {t('problemSolve.viewSolution')}
          </button>
          <div className="flex items-center rounded-lg border border-(--ws-border) overflow-hidden">
            {([['split', <Columns size={14} key="c" />], ['statement', <FileText size={14} key="f" />], ['editor', <Code size={14} key="e" />]] as [LayoutMode, React.ReactNode][]).map(([mode, icon]) => (
              <button
                key={mode}
                onClick={() => setLayout(mode)}
                className={`px-2.5 py-2 transition-colors ${layout === mode ? 'bg-(--ws-accent-soft) text-(--ws-accent)' : 'text-(--ws-muted) hover:text-(--ws-text)'}`}
                title={mode === 'split' ? t('problemSolve.modeSplit') : mode === 'statement' ? t('problemSolve.modeStatementOnly') : t('problemSolve.modeEditorOnly')}
              >
                {icon}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAssistant((v) => !v)}
            className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12.5px] font-medium transition-colors ${showAssistant ? 'border-(--ws-accent) text-(--ws-accent) bg-(--ws-accent-soft)' : 'border-(--ws-border) text-(--ws-muted) hover:text-(--ws-text) hover:border-(--ws-accent)'}`}
          >
            <MessageCircle size={14} /> {showAssistant ? t('problemSolve.hideAssistant') : t('problemSolve.openAssistant')}
          </button>
        </div>

        {/* mobile pane switch */}
        <div className="md:hidden flex border-b border-(--ws-border) bg-(--ws-panel)">
          {(['statement', 'editor'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setMobilePane(p)}
              className={`flex-1 py-2.5 text-[13px] font-semibold ${mobilePane === p ? 'text-(--ws-accent) border-b-2 border-(--ws-accent)' : 'text-(--ws-muted)'}`}
            >
              {p === 'statement' ? t('problemSolve.statementTab') : 'Code'}
            </button>
          ))}
        </div>

        {/* ============ SPLIT BODY ============ */}
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex min-h-0 min-w-0">
            {/* ---- statement / submissions pane ---- */}
            {(layout !== 'editor') && (
              <section
                className={`flex flex-col min-h-0 bg-(--ws-bg) ${
                  layout === 'split'
                    ? `${mobilePane === 'statement' ? 'flex' : 'hidden'} md:flex md:w-1/2 border-r border-(--ws-border)`
                    : 'w-full flex'
                }`}
              >
                {/* Left Pane Navigation Tabs */}
                <div className="flex items-center gap-1 px-4 border-b border-(--ws-border) bg-(--ws-panel) shrink-0 overflow-x-auto">
                  <button
                    onClick={() => setLeftTab('statement')}
                    className={`flex items-center gap-2 px-3.5 py-2.5 text-[12.5px] font-semibold border-b-2 transition-all whitespace-nowrap ${
                      leftTab === 'statement'
                        ? 'border-(--ws-accent) text-(--ws-accent)'
                        : 'border-transparent text-(--ws-muted) hover:text-(--ws-text)'
                    }`}
                  >
                    <FileText size={14} />
                    {t('problemSolve.statement', 'Đề bài')}
                  </button>
                  <button
                    onClick={() => setLeftTab('submissions')}
                    className={`flex items-center gap-2 px-3.5 py-2.5 text-[12.5px] font-semibold border-b-2 transition-all whitespace-nowrap ${
                      leftTab === 'submissions'
                        ? 'border-(--ws-accent) text-(--ws-accent)'
                        : 'border-transparent text-(--ws-muted) hover:text-(--ws-text)'
                    }`}
                  >
                    <Clock size={14} />
                    {t('problemSolve.submissionHistory', 'Lịch sử nộp')}
                    {problemSubmissions.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-(--ws-accent-soft) text-(--ws-accent) font-bold">
                        {problemSubmissions.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setLeftTab('ai_tutor')}
                    className={`flex items-center gap-2 px-3.5 py-2.5 text-[12.5px] font-semibold border-b-2 transition-all whitespace-nowrap ${
                      leftTab === 'ai_tutor'
                        ? 'border-(--ws-accent) text-(--ws-accent)'
                        : 'border-transparent text-(--ws-muted) hover:text-(--ws-text)'
                    }`}
                  >
                    <Sparkles size={14} />
                    <span>AI Tutor</span>
                    {contestId && <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">Khóa khi thi</span>}
                  </button>
                  <button
                    onClick={() => setLeftTab('resources')}
                    className={`flex items-center gap-2 px-3.5 py-2.5 text-[12.5px] font-semibold border-b-2 transition-all whitespace-nowrap ${
                      leftTab === 'resources'
                        ? 'border-(--ws-accent) text-(--ws-accent)'
                        : 'border-transparent text-(--ws-muted) hover:text-(--ws-text)'
                    }`}
                  >
                    <BookOpen size={14} />
                    <span>Tài liệu cho phép</span>
                    {contestId && <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">Hợp lệ</span>}
                  </button>
                </div>

                {/* Left Pane Body */}
                <div className="flex-1 overflow-y-auto ws-editor-scroll">
                  {leftTab === 'statement' && (
                    <div className="px-7 py-6 max-w-3xl">
                      {/* limits */}
                      <div className="grid grid-cols-3 gap-6 pb-5 border-b border-(--ws-border)">
                        <div>
                          <p className="text-[10.5px] font-bold uppercase tracking-widest text-(--ws-faint) mb-1.5">{t('problemSolve.timeLimit')}</p>
                          <p className="text-[15px] font-bold font-mono">{problemTimeLimit}</p>
                        </div>
                        <div>
                          <p className="text-[10.5px] font-bold uppercase tracking-widest text-(--ws-faint) mb-1.5">{t('problemSolve.memoryLimit')}</p>
                          <p className="text-[15px] font-bold font-mono">{problemMemoryLimit}</p>
                        </div>
                        <div>
                          <p className="text-[10.5px] font-bold uppercase tracking-widest text-(--ws-faint) mb-1.5">{t('problemSolve.maxScore')}</p>
                          <p className="text-[15px] font-bold font-mono">{detail.points}</p>
                        </div>
                      </div>

                      <button
                        onClick={downloadStatement}
                        className="mt-5 flex items-center gap-1.5 text-[13px] font-medium text-(--ws-accent) hover:underline"
                      >
                        <Download size={14} /> {t('problemSolve.downloadOriginal')}
                      </button>

                      <h2 className="mt-6 mb-5 text-[26px] font-extrabold leading-tight">{localizedTitle}</h2>

                      {localizedDescription && (
                        <div className="mb-7 rounded-xl border border-(--ws-border) bg-(--ws-panel) p-5">
                          <ReactMarkdown>{localizedDescription}</ReactMarkdown>
                        </div>
                      )}

                      {detail.sections.map((sec, i) => (
                        <div key={i} className="mb-7">
                          {sec.heading && <h3 className="text-[19px] font-bold mb-3">{sec.heading}</h3>}
                          {sec.paragraphs?.map((p, j) => (
                            <p key={j} className="text-[14.5px] leading-7 text-(--ws-text)/90 mb-2">{p}</p>
                          ))}
                          {sec.bullets && (
                            <ul className="space-y-2 ml-1">
                              {sec.bullets.map((b, j) => (
                                <li key={j} className="flex gap-2.5 text-[14.5px] leading-7">
                                  <span className="mt-[11px] w-1.5 h-1.5 rounded-full bg-(--ws-accent) shrink-0" />
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {sec.table && (
                            <div className="overflow-hidden rounded-lg border border-(--ws-border)">
                              <table className="w-full text-[13.5px]">
                                <thead>
                                  <tr className="bg-(--ws-panel2)">
                                    {sec.table.head.map((h, j) => (
                                      <th key={j} className="text-left px-4 py-2.5 font-bold">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {sec.table.rows.map((r, j) => (
                                    <tr key={j} className="border-t border-(--ws-border)">
                                      <td className="px-4 py-2.5 font-semibold italic">{r[0]}</td>
                                      <td className="px-4 py-2.5 font-mono text-[13px]">{r[1]}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* samples in statement */}
                      <h3 className="text-[19px] font-bold mb-3">{t('problemSolve.examplesTitle')}</h3>
                      {detail.samples.map((s, i) => (
                        <div key={i} className="mb-4 grid grid-cols-2 gap-3">
                          <div className="rounded-lg border border-(--ws-border) bg-(--ws-panel) overflow-hidden">
                            <p className="px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-widest text-(--ws-faint) bg-(--ws-panel2)">Input</p>
                            <pre className="px-3 py-2.5 text-[13px] font-mono whitespace-pre-wrap">{s.input}</pre>
                          </div>
                          <div className="rounded-lg border border-(--ws-border) bg-(--ws-panel) overflow-hidden">
                            <p className="px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-widest text-(--ws-faint) bg-(--ws-panel2)">Output</p>
                            <pre className="px-3 py-2.5 text-[13px] font-mono whitespace-pre-wrap">{s.output}</pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {leftTab === 'submissions' && (
                    /* ---- submissions tab content ---- */
                    <div className="p-6 max-w-3xl">
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <h2 className="text-lg font-bold text-(--ws-text)">{t('problemSolve.submissionHistoryHeading')}</h2>
                          <p className="text-xs text-(--ws-muted) mt-0.5">
                            {t('problemSolve.submissionHistorySubtitle')}
                          </p>
                        </div>
                        <button
                          onClick={() => queryClient.invalidateQueries({ queryKey: ['submissions', 'problem', problemId] })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--ws-border) text-xs text-(--ws-muted) hover:text-(--ws-text) hover:border-(--ws-accent) transition-colors"
                          title={t('problemSolve.refreshListTitle')}
                        >
                          <RefreshCw size={13} className={isFetchingSubmissions ? 'animate-spin' : ''} />
                          {t('problemSolve.refreshBtn')}
                        </button>
                      </div>

                      {isLoadingSubmissions ? (
                        <div className="flex flex-col items-center justify-center py-16 text-(--ws-muted)">
                          <Loader2 size={28} className="animate-spin mb-3 text-(--ws-accent)" />
                          <p className="text-sm">{t('problemSolve.loadingSubmissionHistory')}</p>
                        </div>
                      ) : problemSubmissions.length === 0 ? (
                        <div className="rounded-2xl border border-(--ws-border) bg-(--ws-panel) p-12 text-center">
                          <Clock size={36} className="text-(--ws-muted) mx-auto mb-3 opacity-60" />
                          <h3 className="font-semibold text-base mb-1">{t('problemSolve.noSubmissionsYet')}</h3>
                          <p className="text-xs text-(--ws-muted) max-w-xs mx-auto">
                            {t('problemSolve.noSubmissionsHint')}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {problemSubmissions.map((sub) => {
                            const isInspecting = inspectedSubmission?.id === sub.id;
                            const statusUpper = sub.status?.toUpperCase();
                            const isAc = statusUpper === 'ACCEPTED' || statusUpper === 'AC';
                            const isWa = statusUpper === 'WRONG_ANSWER' || statusUpper === 'WA';
                            const isTle = statusUpper === 'TIME_LIMIT_EXCEEDED' || statusUpper === 'TLE';
                            const isCe = statusUpper === 'COMPILE_ERROR' || statusUpper === 'CE';

                            const badgeClass = isAc
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : isWa
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : isTle
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : isCe
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-orange-100 text-orange-800 border-orange-300';

                            const badgeIcon = isAc ? (
                              <CheckCircle2 size={13} className="text-emerald-700" />
                            ) : isWa ? (
                              <XCircle size={13} className="text-rose-700" />
                            ) : (
                              <Clock size={13} className="text-amber-700" />
                            );

                            return (
                              <div
                                key={sub.id}
                                className={`rounded-xl border transition-all ${
                                  isInspecting
                                    ? 'border-(--ws-accent) bg-(--ws-panel) shadow-sm'
                                    : 'border-(--ws-border) bg-(--ws-panel) hover:border-(--ws-accent)/50'
                                }`}
                              >
                                <div className="p-4 flex flex-col gap-3">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeClass}`}
                                      >
                                        {badgeIcon}
                                        {sub.status}
                                      </span>
                                      <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-(--ws-panel2) text-(--ws-muted) font-semibold">
                                        {sub.language_version || sub.language}
                                      </span>
                                    </div>
                                    <span className="text-xs text-(--ws-muted) flex items-center gap-1">
                                      <Clock size={12} />
                                      {formatVNFull(sub.created_at)}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-4 text-xs text-(--ws-muted)">
                                    <span>
                                      {t('problemSolve.executionTimeLabel')} <strong className="text-(--ws-text)">{sub.execution_time != null ? `${sub.execution_time} ms` : '—'}</strong>
                                    </span>
                                    <span>
                                      {t('problemSolve.memoryUsedLabel')} <strong className="text-(--ws-text)">{sub.memory_used != null ? `${(sub.memory_used / 1024).toFixed(1)} MB` : '—'}</strong>
                                    </span>
                                  </div>

                                  {sub.instructor_score != null && (
                                    <div className="flex flex-col gap-1 text-xs bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-lg">
                                      <div className="flex items-center gap-1.5 font-bold">
                                        <span>{t('problemSolve.instructorScoreLabel', { score: sub.instructor_score })}</span>
                                      </div>
                                      {sub.instructor_feedback && (
                                        <p className="text-[11px] text-amber-800 italic bg-white/70 p-1.5 rounded border border-amber-100">
                                          "{sub.instructor_feedback}"
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2 pt-2 border-t border-(--ws-border) flex-wrap">
                                    <button
                                      onClick={() => setInspectedSubmission(isInspecting ? null : sub)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--ws-border) text-xs font-medium text-(--ws-text) hover:border-(--ws-accent) transition-colors"
                                    >
                                      <Code size={13} />
                                      {isInspecting ? t('problemSolve.closeCode') : t('problemSolve.viewCode')}
                                    </button>
                                    <button
                                      onClick={() => restoreCodeFromSubmission(sub)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--ws-accent) text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                                      title={t('problemSolve.loadIntoEditorTitle')}
                                    >
                                      <ClipboardPaste size={13} />
                                      {t('problemSolve.loadIntoEditorBtn')}
                                    </button>
                                    {!isAc && !contestId && (
                                      <button
                                        onClick={() => requestExplainError(sub.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-300 bg-purple-50 text-purple-800 text-xs font-semibold hover:bg-purple-100 transition-colors"
                                        title="Nhờ AI phân tích nguyên nhân lỗi và gợi ý sửa"
                                      >
                                        <Sparkles size={13} className="text-purple-600" />
                                        <span>Hỏi AI về lỗi</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        navigator.clipboard?.writeText(sub.source_code);
                                        showToast(t('problemSolve.copiedSourceToast'), 'success');
                                      }}
                                      className="p-1.5 rounded-lg border border-(--ws-border) text-(--ws-muted) hover:text-(--ws-text) transition-colors ml-auto"
                                      title={t('problemSolve.copySourceTitle')}
                                    >
                                      <Copy size={13} />
                                    </button>
                                  </div>

                                  {isInspecting && (
                                    <div className="mt-2 rounded-lg bg-(--ws-panel2) p-3 border border-(--ws-border) overflow-hidden">
                                      <div className="flex items-center justify-between text-[11px] text-(--ws-muted) mb-2 pb-1.5 border-b border-(--ws-border)">
                                        <span>{t('problemSolve.submissionSourceHeader', { id: sub.id.slice(0, 8), lang: sub.language })}</span>
                                        <span>{t('problemSolve.lineCountSuffix', { count: sub.source_code.split('\n').length })}</span>
                                      </div>
                                      <pre className="text-xs font-mono text-(--ws-text) overflow-x-auto whitespace-pre p-1">
                                        {sub.source_code}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {leftTab === 'ai_tutor' && (
                    <div className="p-6 max-w-3xl">
                      {contestId ? (
                        <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-8 text-center text-amber-900 shadow-sm">
                          <div className="w-16 h-16 rounded-full bg-amber-200/80 flex items-center justify-center mx-auto mb-4 text-2xl">
                            🛡️
                          </div>
                          <h3 className="font-bold text-lg mb-2">AI Tutor bị vô hiệu hóa trong phòng thi</h3>
                          <p className="text-xs text-amber-800/90 max-w-md mx-auto leading-relaxed mb-4">
                            Để đảm bảo tính nghiêm túc và công bằng của kỳ thi trực tuyến, toàn bộ tính năng trợ lý AI đã được tự động khóa đối với bài toán này.
                          </p>
                          <p className="text-xs font-semibold text-amber-900">
                            Vui lòng chuyển qua tab <strong>"Đề bài"</strong> hoặc <strong>"Tài liệu cho phép"</strong> để làm bài.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Sparkles size={20} className="text-(--ws-accent)" />
                              <h2 className="text-lg font-bold text-(--ws-text)">AI Tutor & Trợ lý học tập</h2>
                            </div>
                            <p className="text-xs text-(--ws-muted)">
                              Gợi ý tư duy thuật toán, phân tích độ phức tạp và hỗ trợ gỡ lỗi mà không làm hộ bài giải.
                            </p>
                          </div>

                          {/* Quick action buttons */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <button
                              onClick={() => requestAiHint('HINT')}
                              disabled={aiTutorLoading}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                aiTutorHintType === 'HINT'
                                  ? 'border-(--ws-accent) bg-(--ws-accent-soft) text-(--ws-accent)'
                                  : 'border-(--ws-border) bg-(--ws-panel) hover:border-(--ws-accent) text-(--ws-text)'
                              }`}
                            >
                              <p className="text-xs font-bold mb-0.5">💡 Gợi ý tư duy</p>
                              <p className="text-[11px] text-(--ws-muted)">Hướng tiếp cận</p>
                            </button>
                            <button
                              onClick={() => requestAiHint('COMPLEXITY')}
                              disabled={aiTutorLoading}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                aiTutorHintType === 'COMPLEXITY'
                                  ? 'border-(--ws-accent) bg-(--ws-accent-soft) text-(--ws-accent)'
                                  : 'border-(--ws-border) bg-(--ws-panel) hover:border-(--ws-accent) text-(--ws-text)'
                              }`}
                            >
                              <p className="text-xs font-bold mb-0.5">⏱️ Độ phức tạp</p>
                              <p className="text-[11px] text-(--ws-muted)">Thời gian & Bộ nhớ</p>
                            </button>
                            <button
                              onClick={() => requestAiHint('EDGE_CASE')}
                              disabled={aiTutorLoading}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                aiTutorHintType === 'EDGE_CASE'
                                  ? 'border-(--ws-accent) bg-(--ws-accent-soft) text-(--ws-accent)'
                                  : 'border-(--ws-border) bg-(--ws-panel) hover:border-(--ws-accent) text-(--ws-text)'
                              }`}
                            >
                              <p className="text-xs font-bold mb-0.5">⚠️ Edge Cases</p>
                              <p className="text-[11px] text-(--ws-muted)">Trường hợp đặc biệt</p>
                            </button>
                            <button
                              onClick={() => requestAiHint('EXPLAIN_LOGIC')}
                              disabled={aiTutorLoading}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                aiTutorHintType === 'EXPLAIN_LOGIC'
                                  ? 'border-(--ws-accent) bg-(--ws-accent-soft) text-(--ws-accent)'
                                  : 'border-(--ws-border) bg-(--ws-panel) hover:border-(--ws-accent) text-(--ws-text)'
                              }`}
                            >
                              <p className="text-xs font-bold mb-0.5">🧠 Logic bài toán</p>
                              <p className="text-[11px] text-(--ws-muted)">Giải thích đề</p>
                            </button>
                          </div>

                          {/* AI Tutor Response Area */}
                          <div className="rounded-2xl border border-(--ws-border) bg-(--ws-panel) p-5 shadow-sm min-h-[220px] flex flex-col">
                            {aiTutorLoading ? (
                              <div className="flex-1 flex flex-col items-center justify-center py-12 text-(--ws-muted)">
                                <Loader2 size={28} className="animate-spin text-(--ws-accent) mb-3" />
                                <p className="text-xs font-medium">AI đang suy nghĩ gợi ý cho bạn...</p>
                              </div>
                            ) : aiTutorResponse ? (
                              <div>
                                <div className="flex items-center justify-between pb-3 mb-4 border-b border-(--ws-border) text-xs">
                                  <span className="font-bold flex items-center gap-1.5 text-(--ws-accent)">
                                    <Sparkles size={14} /> Phản hồi từ AI Tutor
                                  </span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard?.writeText(aiTutorResponse);
                                      showToast('Đã sao chép phản hồi!', 'success');
                                    }}
                                    className="p-1 rounded hover:bg-(--ws-panel2) text-(--ws-muted) hover:text-(--ws-text)"
                                    title="Sao chép"
                                  >
                                    <Copy size={13} />
                                  </button>
                                </div>
                                <div className="prose prose-sm max-w-none text-(--ws-text) leading-relaxed">
                                  <ReactMarkdown>{aiTutorResponse}</ReactMarkdown>
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-(--ws-muted)">
                                <Sparkles size={32} className="text-(--ws-muted) opacity-50 mb-3" />
                                <p className="text-xs font-semibold text-(--ws-text) mb-1">Cần gợi ý mà không bị lộ đáp án?</p>
                                <p className="text-[11.5px] max-w-xs text-(--ws-muted)">
                                  Chọn một mục ở trên để nhận hướng dẫn tư duy từng bước cho bài toán này.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {leftTab === 'resources' && (
                    <div className="p-6 max-w-3xl space-y-6">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <BookOpen size={20} className="text-emerald-600" />
                          <h2 className="text-lg font-bold text-(--ws-text)">Tài liệu & Thư viện cho phép</h2>
                        </div>
                        <p className="text-xs text-(--ws-muted)">
                          {contestId
                            ? 'Tài liệu tra cứu hợp lệ trong kỳ thi. Bạn được phép tham khảo tại đây mà không vi phạm quy chế.'
                            : 'Sổ tay tra cứu cú pháp và cấu trúc dữ liệu chuẩn cho C++, Python, Java.'}
                        </p>
                      </div>

                      <div className="space-y-4">
                        {ALLOWED_RESOURCES.map((res) => (
                          <details
                            key={res.id}
                            className="group rounded-2xl border border-(--ws-border) bg-(--ws-panel) overflow-hidden transition-all open:ring-1 open:ring-(--ws-accent)"
                            open={res.id === 'cpp_stl'}
                          >
                            <summary className="flex items-center justify-between p-4 cursor-pointer select-none font-semibold text-sm hover:bg-(--ws-panel2) transition-colors">
                              <span className="flex items-center gap-2">
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-(--ws-accent-soft) text-(--ws-accent) font-mono">
                                  {res.lang}
                                </span>
                                <span>{res.title}</span>
                              </span>
                              <ChevronDown size={16} className="text-(--ws-muted) group-open:rotate-180 transition-transform" />
                            </summary>
                            <div className="p-5 border-t border-(--ws-border) bg-(--ws-bg) prose prose-sm max-w-none text-xs">
                              <ReactMarkdown>{res.content}</ReactMarkdown>
                            </div>
                          </details>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ---- editor pane ---- */}
            {(layout !== 'statement') && (
              <section
                className={`min-w-0 bg-(--ws-editor) ${
                  layout === 'split'
                    ? `${mobilePane === 'editor' ? 'flex' : 'hidden'} md:flex md:w-1/2 flex-col`
                    : 'flex w-full flex-col'
                }`}
              >
              {/* editor toolbar */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-(--ws-border) flex-wrap">
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedLangId}
                    onChange={(e) => setSelectedLangId(e.target.value)}
                    className="px-2.5 py-1.5 bg-(--ws-panel2) border border-(--ws-border) rounded-lg text-[12.5px] font-semibold text-(--ws-text) focus:outline-none focus:border-(--ws-accent) cursor-pointer"
                  >
                    {allowedLangConfigs.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} — {l.compiler}
                      </option>
                    ))}
                  </select>
                  {apiProblem?.allowed_languages && apiProblem.allowed_languages.length > 0 && (
                    <span
                      className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[11px] font-medium"
                      title="Bài tập này có cấu hình giới hạn ngôn ngữ được phép"
                    >
                      <Lock size={11} /> Giới hạn {allowedLangConfigs.length} ngôn ngữ
                    </span>
                  )}
                </div>
                <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-(--ws-border) text-[12.5px] text-(--ws-muted) cursor-pointer hover:text-(--ws-text)">
                  <input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} className="accent-(--ws-accent)" />
                  {t('problemSolve.wordWrap')}
                </label>
                <button
                  onClick={() => onCodeChange(currentLangConfig.template)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-(--ws-border) text-[12.5px] text-(--ws-muted) hover:text-(--ws-text) transition-colors"
                >
                  <RotateCcw size={13} /> {t('problemSolve.resetCode')}
                </button>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(+e.target.value)}
                  className="px-2 py-1.5 bg-(--ws-panel2) border border-(--ws-border) rounded-lg text-[12.5px] focus:outline-none"
                >
                  {[12, 13, 14, 16, 18].map((s) => <option key={s} value={s}>{s}px</option>)}
                </select>

                <div className="flex-1" />
                <button onClick={pasteIntoEditor} className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-semibold text-(--ws-accent) hover:bg-(--ws-accent-soft) transition-colors">
                  <ClipboardPaste size={13} /> {t('problemSolve.pasteIn')}
                </button>
                <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-semibold text-(--ws-accent) bg-(--ws-accent-soft)/30 border border-(--ws-accent)/25 hover:bg-(--ws-accent-soft) transition-colors cursor-pointer">
                  <Upload size={13} /> {t('problemSolve.uploadBtn')}
                  <input type="file" accept={allowedLangConfigs.map((l) => l.extension).join(',') + ',.txt'} className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
                </label>
                <span className={`text-[11.5px] ${saveState === 'saved' ? 'text-(--ws-faint)' : 'text-(--ws-warn)'}`}>
                  {saveState === 'saved' ? t('problemSolve.saved') : saveState === 'saving' ? t('problemSolve.saving') : t('problemSolve.unsaved')}
                </span>
              </div>

              {/* intellisense row */}
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-(--ws-border-soft)">
                <label className="flex items-center gap-2 text-[12.5px] text-(--ws-muted) cursor-pointer select-none">
                  IntelliSense
                  <button
                    onClick={() => setIntelli(!intelli)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${intelli ? 'bg-(--ws-accent)' : 'bg-(--ws-border)'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${intelli ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </label>
                {intelli && (
                  <span className="text-[11px] text-(--ws-faint) hidden sm:block">
                    {t('problemSolve.lineCount', { count: lineCount })} • {t('problemSolve.charCount', { count: code.length })} • {currentLangConfig.name}
                  </span>
                )}
              </div>

              {/* code area */}
              <div ref={codeAreaRef} className="relative flex-1 min-h-0 overflow-hidden" style={{ fontSize }}>
                {/* gutter */}
                <div
                  ref={gutterRef}
                  className="absolute left-0 top-0 bottom-0 w-12 overflow-hidden py-3 text-right pr-3 select-none font-mono leading-6 text-(--ws-gutter)"
                  aria-hidden
                >
                  {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                {/* highlight layer */}
                <pre
                  ref={preRef}
                  aria-hidden
                  className={`absolute inset-0 left-12 m-0 py-3 pr-4 font-mono leading-6 pointer-events-none overflow-hidden text-(--ws-text) ${
                    wrap ? 'whitespace-pre-wrap wrap-break-word' : 'whitespace-pre'
                  }`}
                  dangerouslySetInnerHTML={{ __html: highlighted + '\n' }}
                />
                {/* textarea */}
                <textarea
                  ref={taRef}
                  value={code}
                  onChange={(e) => onCodeChange(e.target.value)}
                  onScroll={syncScroll}
                  onKeyDown={onKeyDown}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  className={`ws-editor-scroll absolute inset-0 left-12 w-[calc(100%-3rem)] h-full py-3 pr-4 bg-transparent font-mono leading-6 resize-none outline-none text-transparent caret-(--ws-accent) selection:bg-(--ws-accent-soft) ${
                    wrap ? 'whitespace-pre-wrap wrap-break-word' : 'whitespace-pre overflow-auto'
                  }`}
                />
              </div>

              {bottomPanelOpen && (
                <div
                  onMouseDown={startBottomResize}
                  className="group h-1.5 shrink-0 cursor-row-resize bg-transparent hover:bg-(--ws-accent-soft) transition-colors relative"
                  role="separator"
                  aria-orientation="horizontal"
                  aria-label={t('problemSolve.dragResizeLabel')}
                >
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-1 rounded-full bg-(--ws-border) group-hover:bg-(--ws-accent) transition-colors" />
                </div>
              )}

              {/* ============ bottom panel ============ */}
              <div
                ref={bottomPanelRef}
                className="border-t border-(--ws-border) bg-(--ws-panel) flex flex-col shrink-0 overflow-hidden"
                style={{ height: bottomPanelOpen ? bottomHeight : COLLAPSED_BOTTOM_PANEL_HEIGHT }}
              >
                <div className={`flex items-center gap-1 px-3 ${bottomPanelOpen ? 'pt-2 border-b border-(--ws-border-soft)' : 'h-12'}`}>
                  {bottomPanelOpen && ([
                    ['tests', t('problemSolve.tabSamples'), <FlaskConical size={13} key="i" />],
                    ['console', t('problemSolve.consoleTab'), <Terminal size={13} key="i" />],
                    ['results', t('problemSolve.tabResults'), <CheckCircle2 size={13} key="i" />],
                    ['debug', t('problemSolve.debugTab'), <Bug size={13} key="i" />],
                  ] as [BottomTab, string, React.ReactNode][]).map(([tab, label, icon]) => (
                    <button
                      key={tab}
                      onClick={() => setBottomTab(tab)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-semibold border-b-2 -mb-px transition-colors ${
                        bottomTab === tab
                          ? 'text-(--ws-accent) border-(--ws-accent)'
                          : 'text-(--ws-muted) border-transparent hover:text-(--ws-text)'
                      }`}
                    >
                      {icon} {label}
                      {tab === 'results' && finalVerdict && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${finalVerdict === 'AC' ? 'bg-(--ws-accent-soft) text-(--ws-ok)' : 'bg-red-500/15 text-(--ws-danger)'}`}>
                          {finalVerdict}
                        </span>
                      )}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <div className={`flex items-center gap-2 ${bottomPanelOpen ? 'pb-1.5' : ''}`}>
                    <button
                      onClick={runSamples}
                      disabled={running || judging}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--ws-border) text-[12.5px] font-semibold text-(--ws-text) hover:border-(--ws-accent) hover:text-(--ws-accent) transition-colors disabled:opacity-50"
                    >
                      {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} {t('problemSolve.runBtn')}
                    </button>
                    <button
                      onClick={submit}
                      disabled={isSubmitLocked}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#193a2b] text-white text-[12.5px] font-bold hover:bg-[#122c26] transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(25,58,43,0.22)]"
                    >
                      {judging ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} {cooldownSeconds > 0 ? t('problemSolve.submitCooldown', { seconds: cooldownSeconds }) : t('problemSolve.submitBtn')}
                    </button>
                    <button
                      onClick={() => {
                        if (bottomPanelOpen) {
                          setBottomPanelOpen(false);
                        } else {
                          setBottomHeight(DEFAULT_BOTTOM_PANEL_HEIGHT);
                          setBottomPanelOpen(true);
                        }
                      }}
                      className="p-1.5 rounded-lg border border-(--ws-border) text-(--ws-muted) hover:text-(--ws-accent) hover:border-(--ws-accent) transition-colors"
                      title={t(bottomPanelOpen ? 'problemSolve.collapsePanel' : 'problemSolve.expandPanel')}
                      aria-label={t(bottomPanelOpen ? 'problemSolve.collapsePanel' : 'problemSolve.expandPanel')}
                      aria-expanded={bottomPanelOpen}
                    >
                      {bottomPanelOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                  </div>
                </div>

                {bottomPanelOpen && <div className="flex-1 overflow-y-auto ws-editor-scroll p-4">
                  {judging && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-[11.5px] text-(--ws-muted) mb-1.5">
                        <span>{t('problemSolve.judging', { percent: Math.round(judgeProgress) })}</span>
                        <span>{Math.round((judgeProgress / 100) * 8)}/8 tests</span>
                      </div>
                      <div className="h-1.5 bg-(--ws-panel2) rounded-full overflow-hidden">
                        <div className="h-full bg-(--ws-accent) transition-all duration-300" style={{ width: `${judgeProgress}%` }} />
                      </div>
                    </div>
                  )}

                  {bottomTab === 'tests' && (
                    <div className="space-y-5">
                      {samples.map((s, i) => (
                        <div key={i}>
                          <p className="text-[10.5px] font-bold uppercase tracking-widest text-(--ws-faint) mb-2">{t('problemSolve.groupLabel', { index: i + 1 })}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="relative rounded-lg border border-(--ws-border) bg-(--ws-editor) overflow-hidden group">
                              <textarea
                                value={s.input}
                                onChange={(e) => setSamples(samples.map((x, j) => (j === i ? { ...x, input: e.target.value } : x)))}
                                spellCheck={false}
                                className="w-full h-24 px-3 py-2.5 bg-transparent font-mono text-[12.5px] leading-5 resize-none outline-none text-(--ws-text)"
                              />
                              <button
                                id={`copy-in-${i}`}
                                onClick={() => copyText(s.input, `copy-in-${i}`)}
                                className="absolute top-2 right-2 p-1.5 rounded-md bg-(--ws-panel2) text-(--ws-muted) opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                            <div className="relative rounded-lg border border-(--ws-border) bg-(--ws-editor) overflow-hidden group">
                              <pre className="px-3 py-2.5 font-mono text-[12.5px] leading-5 whitespace-pre-wrap text-(--ws-text)">{s.output}</pre>
                              <button
                                id={`copy-out-${i}`}
                                onClick={() => copyText(s.output, `copy-out-${i}`)}
                                className="absolute top-2 right-2 p-1.5 rounded-md bg-(--ws-panel2) text-(--ws-muted) opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </div>
                          {sampleOutputs[i] !== undefined && (
                            <div className={`mt-2 rounded-lg border px-3 py-2 text-[12px] font-mono ${sampleOutputs[i].ok ? 'border-(--ws-ok)/30 bg-(--ws-ok)/5' : 'border-(--ws-danger)/30 bg-(--ws-danger)/5'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${sampleOutputs[i].ok ? 'bg-(--ws-ok)/20 text-(--ws-ok)' : 'bg-(--ws-danger)/20 text-(--ws-danger)'}`}>
                                  {sampleOutputs[i].ok ? `OK${sampleOutputs[i].time !== undefined ? ` · ${sampleOutputs[i].time}ms` : ''}` : 'WRONG ANSWER'}
                                </span>
                                <span className="text-(--ws-faint) text-[11px]">{t('problemSolve.actualResult')}</span>
                              </div>
                              <pre className="whitespace-pre-wrap break-all text-(--ws-text) leading-5">{sampleOutputs[i].actual || t('problemSolve.noOutput')}</pre>
                            </div>
                          )}
                        </div>
                      ))}
                      <p className="text-[11.5px] italic text-(--ws-faint)">
                        {t('problemSolve.runSamplesHint')}
                      </p>
                    </div>
                  )}

                  {bottomTab === 'console' && (
                    <div className="font-mono text-[12.5px] leading-6 space-y-0.5">
                      {consoleLines.length === 0 && <p className="text-(--ws-faint)">{t('problemSolve.consoleEmpty')}</p>}
                      {consoleLines.map((l, i) => (
                        <p key={i} className="animate-slide-up">
                          <span className="text-(--ws-faint) mr-2">[{l.time}]</span>
                          <span className={l.kind === 'ok' ? 'text-(--ws-ok)' : l.kind === 'err' ? 'text-(--ws-danger)' : l.kind === 'sys' ? 'text-(--ws-accent)' : 'text-(--ws-text)'}>
                            {l.msg}
                          </span>
                        </p>
                      ))}
                      {(running || judging) && <span className="inline-block w-2 h-4 bg-(--ws-accent) animate-pulse-dot align-middle" />}
                    </div>
                  )}

                  {bottomTab === 'results' && (
                    <div>
                      {testVerdicts.length === 0 ? (
                        <p className="text-(--ws-faint) text-[13px]">{t('problemSolve.noResultYet')}</p>
                      ) : (
                        <>
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-4 font-bold text-[13px] ${
                            finalVerdict === 'AC' ? 'bg-(--ws-accent-soft) text-(--ws-ok)' : 'bg-red-500/10 text-(--ws-danger)'
                          }`}>
                            {finalVerdict === 'AC' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                            {finalVerdict === 'AC' ? t('problemSolve.acceptedLabel', { points: detail.points }) : finalVerdict === 'TLE' ? t('problemSolve.verdictTLE') : t('problemSolve.verdictWA')}
                          </div>
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                            {testVerdicts.map((tv) => (
                              <div
                                key={tv.id}
                                title={`Test ${tv.id}: ${tv.status} • ${tv.time}ms • ${tv.memory}MB`}
                                className={`rounded-lg border px-2 py-2 text-center transition-transform hover:scale-105 ${
                                  tv.status === 'AC'
                                    ? 'border-(--ws-ok)/40 bg-(--ws-ok)/10 text-(--ws-ok)'
                                    : 'border-(--ws-danger)/40 bg-(--ws-danger)/10 text-(--ws-danger)'
                                }`}
                              >
                                <p className="text-[10px] font-bold">#{tv.id}</p>
                                <p className="text-[13px] font-extrabold">{tv.status}</p>
                                <p className="text-[9.5px] opacity-75">{tv.time}ms</p>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {bottomTab === 'debug' && (
                    <div className="text-[13px] text-(--ws-muted) space-y-2">
                      <p className="flex items-center gap-2 text-(--ws-text) font-semibold"><Bug size={14} /> {t('problemSolve.debuggerTitle')}</p>
                      <p>{t('problemSolve.noExceptions')}</p>
                      <p className="text-[12px] text-(--ws-faint)">{t('problemSolve.debugHint')}</p>
                    </div>
                  )}
                </div>}
              </div>
              </section>
            )}
          </div>

          {showAssistant && (
            <aside className="hidden lg:flex w-[360px] border-l border-(--ws-border) bg-(--ws-panel) flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-(--ws-border) bg-(--ws-panel2)">
                <div className="flex items-center gap-2">
                  <MessageCircle size={15} className="text-(--ws-accent)" />
                  <div>
                    <p className="text-[13px] font-semibold text-(--ws-text)">AI Assistant</p>
                    <p className="text-[11px] text-(--ws-faint)">{t('problemSolve.assistantSubtitle')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAssistant(false)}
                  className="rounded-lg p-1.5 text-(--ws-muted) hover:bg-(--ws-panel) hover:text-(--ws-text)"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto ws-editor-scroll p-3 space-y-2 bg-(--ws-bg)">
                {assistantMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-[13px] leading-6 ${msg.role === 'user' ? 'bg-(--ws-accent) text-[#062a25]' : 'bg-(--ws-panel) text-(--ws-text) border border-(--ws-border)'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {assistantBusy && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl border border-(--ws-border) bg-(--ws-panel) px-3 py-2 text-[13px] text-(--ws-muted)">
                      {t('problemSolve.thinking')}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={askAssistant} className="border-t border-(--ws-border) bg-(--ws-panel) p-3">
                <div className="flex items-center gap-2 rounded-xl border border-(--ws-border) bg-(--ws-editor) px-3 py-2">
                  <input
                    value={assistantInput}
                    onChange={(e) => setAssistantInput(e.target.value)}
                    placeholder={t('problemSolve.askPlaceholder')}
                    className="flex-1 bg-transparent text-[13px] text-(--ws-text) outline-none placeholder:text-(--ws-faint)"
                  />
                  <button type="submit" disabled={assistantBusy || !assistantInput.trim()} className="rounded-lg bg-(--ws-accent) p-2 text-[#062a25] disabled:opacity-50">
                    <Send size={14} />
                  </button>
                </div>
              </form>
            </aside>
          )}
        </div>

      <button
        onClick={() => setShowAssistantMobile(true)}
        className="fixed bottom-4 right-4 z-85 flex lg:hidden items-center gap-2 rounded-full bg-[#193a2b] px-4 py-3 text-[13px] font-semibold text-white shadow-xl transition-transform hover:scale-105 hover:bg-[#122c26]"
      >
        <MessageCircle size={16} />
        {t('problemSolve.aiAssistantTitle')}
      </button>

      {showAssistantMobile && (
        <div className="fixed inset-0 z-90 bg-black/55 backdrop-blur-[2px] lg:hidden" onClick={() => setShowAssistantMobile(false)}>
          <div className="absolute bottom-0 left-0 right-0 h-[72vh] rounded-t-2xl border-t border-x border-(--ws-border) bg-(--ws-panel) flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-(--ws-border)">
              <div className="flex items-center gap-2">
                <MessageCircle size={15} className="text-(--ws-accent)" />
                <p className="text-[13px] font-semibold">Leet Coach</p>
              </div>
              <button onClick={() => setShowAssistantMobile(false)} className="rounded-lg p-1.5 text-(--ws-muted) hover:bg-(--ws-panel2) hover:text-(--ws-text)">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto ws-editor-scroll p-3 space-y-2 bg-(--ws-bg)">
              {assistantMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-[13px] leading-6 ${msg.role === 'user' ? 'bg-(--ws-accent) text-[#062a25]' : 'bg-(--ws-panel) text-(--ws-text) border border-(--ws-border)'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {assistantBusy && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-(--ws-border) bg-(--ws-panel) px-3 py-2 text-[13px] text-(--ws-muted)">
                    {t('problemSolve.thinking')}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={askAssistant} className="border-t border-(--ws-border) bg-(--ws-panel) p-3">
              <div className="flex items-center gap-2 rounded-xl border border-(--ws-border) bg-(--ws-editor) px-3 py-2">
                <input
                  value={assistantInput}
                  onChange={(e) => setAssistantInput(e.target.value)}
                  placeholder={t('problemSolve.askPlaceholder')}
                  className="flex-1 bg-transparent text-[13px] text-(--ws-text) outline-none placeholder:text-(--ws-faint)"
                />
                <button type="submit" disabled={assistantBusy || !assistantInput.trim()} className="rounded-lg bg-(--ws-accent) p-2 text-[#062a25] disabled:opacity-50">
                  <Send size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ SOLUTION MODAL ============ */}
      {showSolution && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-90 flex items-center justify-center p-4" onClick={() => setShowSolution(false)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--ws-border)">
              <h3 className="font-bold text-[15px]">{t('problemSolve.referenceSolutionTitle', { title: problemTitle })}</h3>
              <button onClick={() => setShowSolution(false)} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={18} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-64px)]">
              <div className="flex items-center gap-2 mb-3 text-[12px] text-(--ws-muted)">
                <Clock size={13} /> {detail.timeLimit}
                <Zap size={13} className="ml-3" /> {detail.memoryLimit}
              </div>
              <pre className="ws-dark bg-[#0b1210] border border-(--ws-border) rounded-xl p-4 overflow-x-auto font-mono text-[12.5px] leading-6 text-[#e4ece8]" dangerouslySetInnerHTML={{ __html: highlightCode(detail.solutions[lang] || currentLangConfig.template) }} />
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ============ GUIDE MODAL ============ */}
      {showGuide && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-90 flex items-center justify-center p-4" onClick={() => setShowGuide(false)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--ws-border)">
              <h3 className="font-bold text-[15px]">{t('problemSolve.usageGuide')}</h3>
              <button onClick={() => setShowGuide(false)} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3 text-[13.5px] leading-6 text-(--ws-muted)">
              {[
                ['⌘K', t('problemSolve.guideSearch')],
                [t('problemSolve.runBtn'), t('problemSolve.guideRun')],
                [t('problemSolve.submitBtn'), t('problemSolve.guideSubmit')],
                [t('problemSolve.resetCode'), t('problemSolve.guideReset')],
                [t('problemSolve.guideUploadPasteLabel'), t('problemSolve.guideUploadPaste')],
                [t('problemSolve.guideModeLabel'), t('problemSolve.guideMode')],
              ].map(([k, v], i) => (
                <div key={i} className="flex gap-3">
                  <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 h-fit rounded-md bg-(--ws-accent-soft) text-(--ws-accent)">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ============ DISQUALIFIED FULLSCREEN OVERLAY ============ */}
      {isDisqualified && hasDocument && createPortal((
        <div className="fixed inset-0 z-9999 bg-red-950/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center text-white select-none">
          <div className="w-20 h-20 rounded-full bg-red-900 border-2 border-red-500 flex items-center justify-center text-4xl mb-6 shadow-2xl animate-pulse">
            🚫
          </div>
          <h1 className="text-3xl font-extrabold mb-3 text-red-100">
            BÀI THI CỦA BẠN ĐÃ BỊ HỦY BỎ
          </h1>
          <p className="text-sm text-red-300 max-w-lg mb-6 leading-relaxed">
            Hệ thống giám sát ghi nhận bạn đã vi phạm quy chế thi cử quá 3 lần (chuyển tab, rời cửa sổ hoặc thoát chế độ toàn màn hình F11). Quyền nộp bài đã bị vô hiệu hóa.
          </p>
          <div className="bg-red-900/60 border border-red-700/80 rounded-xl px-6 py-3 text-xs font-mono text-red-200 mb-8">
            Số lần vi phạm: {cheatWarnings}/3 • Trạng thái: DISQUALIFIED
          </div>
          <button
            onClick={() => navigate('/student/contest')}
            className="px-6 py-3 bg-white text-red-900 font-bold rounded-xl shadow-lg hover:bg-red-100 transition-colors"
          >
            Quay về trang Kỳ thi
          </button>
        </div>
      ), document.body)}
    </div>
  );
}
