import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { ApiError, apiFetch } from '../../api/http';
import { useProblemQuery } from '../../api/problems';
import { useToast } from '../../context/ToastContext';
import { io, type Socket } from 'socket.io-client';
import {
  HelpCircle,
  Send,
  Columns,
  FileText,
  Code,
  Download,
  Play,
  Copy,
  RotateCcw,
  Upload,
  ClipboardPaste,
  X,
  CheckCircle2,
  XCircle,
  Terminal,
  Bug,
  FlaskConical,
  Loader2,
  MessageCircle,
} from 'lucide-react';

/* ---------------- languages & generic starter templates ----------------
 * Backend chưa lưu template code riêng cho từng bài, nên dùng khung code
 * khởi điểm chung theo ngôn ngữ (không phụ thuộc data/problemDetails.ts).
 */

type Lang = 'cpp' | 'python' | 'java';

const LANG_LABELS: Record<Lang, string> = {
  cpp: 'C++17',
  python: 'Python 3.11',
  java: 'Java 21',
};

const DEFAULT_TEMPLATES: Record<Lang, string> = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // TODO: đọc dữ liệu và giải

    return 0;
}
`,
  python: `import sys
input = sys.stdin.readline

# TODO: đọc dữ liệu và giải
`,
  java: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        // TODO: đọc dữ liệu và giải
    }
}
`,
};

const BACKEND_LANGUAGE: Record<Lang, string> = {
  cpp: 'CPP',
  python: 'PYTHON',
  java: 'JAVA',
};

interface SampleTest {
  input: string;
  output: string;
  note?: string;
}

/* ---------------- syntax highlighting ---------------- */

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlight(code: string, lang: Lang): string {
  const esc = escapeHtml(code);
  let regex: RegExp;
  if (lang === 'python') {
    regex =
      /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b(\d+(?:\.\d+)?)\b|\b(def|return|if|elif|else|for|while|in|not|and|or|break|continue|import|from|as|class|lambda|pass|with|try|except|finally|True|False|None|print|range|len|input|map|int|str|list|sorted|sum|abs)\b/g;
  } else if (lang === 'java') {
    regex =
      /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b(\d+(?:\.\d+)?[Ll]?)\b|\b(public|private|protected|static|final|class|interface|void|int|long|double|float|char|boolean|byte|short|return|if|else|for|while|do|break|continue|new|import|package|try|catch|finally|throw|throws|this|null|true|false)\b|\b([A-Z][A-Za-z0-9_]*)\b|(\w+)(?=\s*\()/g;
  } else {
    regex =
      /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(^[ \t]*#[^\n]*)|\b(\d+(?:\.\d+)?[Ll]?)\b|\b(using|namespace|int|long|long long|double|float|char|void|bool|return|if|else|for|while|do|break|continue|struct|class|const|auto|true|false|nullptr|new|delete|public|private|static|sizeof|typedef)\b|\b(vector|string|cin|cout|endl|cerr|map|set|pair|queue|stack|priority_queue|array)\b|(\w+)(?=\s*\()/gm;
  }

  return esc.replace(regex, (m, com, str, g3, g4, g5, g6, g7) => {
    if (com) return `<span class="tok-com">${com}</span>`;
    if (str) return `<span class="tok-str">${str}</span>`;
    if (lang === 'python') {
      if (g3) return `<span class="tok-num">${g3}</span>`;
      if (g4) return `<span class="tok-kw">${g4}</span>`;
      return m;
    }
    if (lang === 'java') {
      if (g3) return `<span class="tok-num">${g3}</span>`;
      if (g4) return `<span class="tok-kw">${g4}</span>`;
      if (g5) return `<span class="tok-ty">${g5}</span>`;
      if (g6) return `<span class="tok-fn">${g6}</span>`;
      return m;
    }
    // C++: g3 preprocessor, g4 number, g5 keyword, g6 type, g7 function
    if (g3) return `<span class="tok-pp">${g3}</span>`;
    if (g4) return `<span class="tok-num">${g4}</span>`;
    if (g5) return `<span class="tok-kw">${g5}</span>`;
    if (g6) return `<span class="tok-ty">${g6}</span>`;
    if (g7) return `<span class="tok-fn">${g7}</span>`;
    return m;
  });
}

/* ---------------- types ---------------- */

type LayoutMode = 'split' | 'statement' | 'editor';
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

export default function ProblemSolve() {
  const { id } = useParams();
  const { showToast } = useToast();
  const { data: apiProblem, isLoading, error } = useProblemQuery(id);

  const problemId = apiProblem?.id ?? id ?? 'unknown-problem';
  const problemTitle = apiProblem?.title ?? 'Bài tập';
  const problemDifficulty = apiProblem?.difficulty ?? 'MEDIUM';
  const problemDescription = apiProblem?.description ?? '';
  const problemPoints = useMemo(() => {
    if (problemDifficulty === 'EASY') return 100;
    if (problemDifficulty === 'HARD') return 300;
    return 200;
  }, [problemDifficulty]);

  const problemSamples: SampleTest[] = useMemo(
    () =>
      (apiProblem?.test_cases ?? [])
        .filter((tc) => !tc.is_hidden)
        .map((tc) => ({ input: tc.input, output: tc.expected_output })),
    [apiProblem]
  );

  /* ui state */
  const [layout, setLayout] = useState<LayoutMode>('split');
  const [mobilePane, setMobilePane] = useState<'statement' | 'editor'>('statement');
  const [showGuide, setShowGuide] = useState(false);
  const hasDocument = typeof document !== 'undefined';

  /* editor state */
  const [lang, setLang] = useState<Lang>('cpp');
  const [code, setCode] = useState(() =>
    localStorage.getItem(`jh-code-${problemId}-cpp`) ?? DEFAULT_TEMPLATES.cpp
  );
  const [wrap, setWrap] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [intelli, setIntelli] = useState(true);
  const [saveState, setSaveState] = useState<'saved' | 'unsaved' | 'saving'>('saved');

  /* judge state */
  const [bottomTab, setBottomTab] = useState<BottomTab>('tests');
  const [samples, setSamples] = useState(problemSamples.map((s) => ({ ...s })));
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
      content: `Xin chào! Tôi là trợ lý học tập cho bài “${problemTitle}”. Bạn có thể hỏi về đề bài, gợi ý thuật toán hoặc cách viết code.`,
    },
  ]);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number | null>(null);
  const submissionSocketRef = useRef<Socket | null>(null);

  useEffect(() => {
    return () => {
      submissionSocketRef.current?.disconnect();
      submissionSocketRef.current = null;
    };
  }, []);

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
    const saved = localStorage.getItem(`jh-code-${problemId}-${lang}`);
    setCode(saved ?? DEFAULT_TEMPLATES[lang]);
    setSaveState(saved ? 'saved' : 'unsaved');
    setTestVerdicts([]);
    setFinalVerdict(null);
    setConsoleLines([]);
    setSamples(problemSamples.map((s) => ({ ...s })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId, lang, problemSamples]);

  useEffect(() => {
    setAssistantMessages([
      {
        id: Date.now(),
        role: 'assistant',
        content: `Xin chào! Tôi là trợ lý học tập cho bài “${problemTitle}”. Bạn có thể hỏi về đề bài, gợi ý thuật toán hoặc cách viết code.`,
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
      localStorage.setItem(`jh-code-${problemId}-${lang}`, v);
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

  /* -------- run against sample tests (real API) -------- */
  const runSamples = async () => {
    if (samples.length === 0) {
      pushConsole('Bài này không có test mẫu công khai để chạy thử.', 'err');
      return;
    }

    setRunning(true);
    setBottomTab('console');
    setConsoleLines([]);
    pushConsole(`$ judge --run --lang ${LANG_LABELS[lang]}`, 'sys');

    if (code.trim().length < 5) {
      pushConsole('error: source code trống — không có gì để chạy.', 'err');
      setRunning(false);
      return;
    }

    const socketUrl = (import.meta.env.VITE_SOCKET_URL as string | undefined) ?? window.location.origin;
    const socket = io(socketUrl, { transports: ['websocket'] });

    type CustomRunResult = {
      session_id: string;
      status: string;
      stdout: string;
      stderr: string;
    };

    const waitForResult = (sessionId: string) =>
      new Promise<CustomRunResult>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          socket.off('custom_run_result', handler);
          reject(new Error('timeout'));
        }, 20000);

        function handler(payload: CustomRunResult) {
          if (payload.session_id !== sessionId) return;
          window.clearTimeout(timeout);
          socket.off('custom_run_result', handler);
          resolve(payload);
        }

        socket.on('custom_run_result', handler);
      });

    try {
      await new Promise<void>((resolve, reject) => {
        socket.once('connect', () => resolve());
        socket.once('connect_error', () => reject(new Error('connect_error')));
      });

      let allOk = true;

      for (let i = 0; i < samples.length; i++) {
        const sample = samples[i];
        pushConsole(`Đang chạy test mẫu ${i + 1}/${samples.length}...`, 'info');

        const { session_id } = await apiFetch<{ session_id: string }>('/api/v1/submissions/run-custom', {
          method: 'POST',
          body: JSON.stringify({
            language: BACKEND_LANGUAGE[lang],
            source_code: code,
            custom_input: sample.input,
          }),
        });

        socket.emit('join_custom_run', { session_id });
        const result = await waitForResult(session_id);
        const status = result.status.toUpperCase();
        const stdout = (result.stdout ?? '').trim();
        const expected = sample.output.trim();

        if (status === 'COMPILE_ERROR') {
          pushConsole(`Test mẫu ${i + 1}: lỗi biên dịch.`, 'err');
          if (result.stderr) pushConsole(result.stderr, 'err');
          allOk = false;
          break;
        }

        if (status === 'RUNTIME_ERROR' || status === 'TIME_LIMIT_EXCEEDED' || status === 'MEMORY_LIMIT_EXCEEDED') {
          pushConsole(`Test mẫu ${i + 1}: ${status}.`, 'err');
          allOk = false;
          continue;
        }

        const ok = stdout === expected;
        allOk = allOk && ok;
        pushConsole(
          ok ? `Test mẫu ${i + 1}: khớp kết quả mong đợi.` : `Test mẫu ${i + 1}: đầu ra khác kỳ vọng.`,
          ok ? 'ok' : 'err'
        );
        if (!ok) {
          pushConsole(`  Mong đợi: ${expected}`, 'info');
          pushConsole(`  Nhận được: ${stdout}`, 'info');
        }
      }

      pushConsole(allOk ? 'Tất cả test mẫu đều khớp kết quả mong đợi.' : 'Có test mẫu chưa khớp kết quả mong đợi.', allOk ? 'ok' : 'err');
    } catch (runError) {
      if (runError instanceof ApiError) {
        pushConsole(`error: ${runError.message}`, 'err');
        showToast(runError.message || 'Không thể chạy thử code lúc này.', 'error');
      } else {
        pushConsole('error: không thể kết nối máy chấm để chạy thử.', 'err');
        showToast('Không thể kết nối máy chấm để chạy thử.', 'error');
      }
    } finally {
      socket.disconnect();
      setRunning(false);
    }
  };

  const submit = async () => {
    setJudging(true);
    setBottomTab('console');
    setConsoleLines([]);
    setFinalVerdict(null);
    setTestVerdicts([]);
    setJudgeProgress(0);
    pushConsole(`$ judge --submit --lang ${LANG_LABELS[lang]}`, 'sys');
    pushConsole('Đang gửi bài lên máy chấm...', 'info');
    let submissionId: string;
    try {
      const response = await apiFetch<{ submission_id: string }>('/api/v1/submissions', {
        method: 'POST',
        body: JSON.stringify({
          problem_id: problemId,
          language: BACKEND_LANGUAGE[lang],
          source_code: code,
        }),
      });
      submissionId = response.submission_id;
      if (!submissionId) {
        throw new Error('Backend không trả về mã bài nộp.');
      }
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        if (submitError.status === 429) {
          showToast('Bạn thao tác quá nhanh, vui lòng chờ 60 giây trước khi nộp lại.', 'error');
          setCooldownUntil(Date.now() + 60_000);
          pushConsole('error: throttled by server (429 Too Many Requests)', 'err');
        } else if (submitError.status === 403) {
          showToast('Kỳ thi đã đóng, bạn không thể nộp bài lúc này.', 'error');
          pushConsole('error: deadline passed (403 Forbidden)', 'err');
        } else if (submitError.status === 409) {
          showToast('Bài nộp của bạn bị trùng hoặc không hợp lệ.', 'error');
          pushConsole('error: conflict detected (409 Conflict)', 'err');
        } else {
          showToast(submitError.message || 'Không thể gửi bài lên máy chấm.', 'error');
          pushConsole('error: không thể gửi bài lên máy chấm.', 'err');
        }
      } else {
        showToast('Không thể gửi bài lên máy chấm.', 'error');
        pushConsole('error: không thể gửi bài lên máy chấm.', 'err');
      }
      setJudging(false);
      return;
    }

    const socketUrl = (import.meta.env.VITE_SOCKET_URL as string | undefined) ?? window.location.origin;
    const socket = io(socketUrl, { transports: ['websocket'] });
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
      showToast('Máy chấm không phản hồi (Timeout). Vui lòng thử lại.', 'error');
      pushConsole('error: máy chấm không phản hồi sau 60s.', 'err');
      setJudging(false);
      socket.disconnect();
      submissionSocketRef.current = null;
    }, 60000);

    socket.on('connect', () => {
      socket.emit('join_submission', { submission_id: submissionId });
      pushConsole(`Đã kết nối theo dõi bài nộp ${submissionId}.`, 'info');
    });

    socket.on('submission_status_changed', (payload: SubmissionStatusPayload) => {
      const status = payload.status.toUpperCase();
      const verdict = terminalVerdicts[status];
      setJudgeProgress(verdict ? 100 : status === 'IN_QUEUE' ? 35 : 15);
      pushConsole(`Trạng thái bài nộp: ${status}.`, verdict === 'AC' ? 'ok' : verdict ? 'err' : 'info');

      if (!verdict) return;

      window.clearTimeout(watchdogTimer);
      setFinalVerdict(verdict);
      setBottomTab('results');
      setJudging(false);
      socket.disconnect();
      submissionSocketRef.current = null;
    });

    socket.on('connect_error', () => {
      window.clearTimeout(watchdogTimer);
      showToast('Không thể kết nối máy chủ chấm bài.', 'error');
      pushConsole('error: không thể kết nối Socket.io.', 'err');
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
      pushConsole('Không thể truy cập clipboard — hãy cấp quyền dán.', 'err');
    }
  };

  const uploadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => onCodeChange(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  const downloadStatement = () => {
    const markdown = problemDescription || `Bài toán "${problemTitle}" chưa có mô tả chi tiết.`;
    const blob = new Blob([`# ${problemTitle}\n\n${markdown}`], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${problemTitle.replace(/\s+/g, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const getAssistantReply = (text: string) => {
    const input = text.toLowerCase();
    if (input.includes('gợi ý') || input.includes('hint') || input.includes('ý tưởng')) {
      return `Gợi ý cho ${problemTitle}: hãy bắt đầu bằng cách phân tích đầu vào, đầu ra và các trường hợp biên. Sau đó, thử xây dựng một giải pháp đơn giản trước khi tối ưu.`;
    }
    if (input.includes('độ phức tạp') || input.includes('complex')) {
      return `Bạn có thể ưu tiên giải pháp có độ phức tạp tuyến tính hoặc logarit nếu phù hợp. Hãy chú ý đến số lần duyệt dữ liệu và bộ nhớ sử dụng.`;
    }
    if (input.includes('code') || input.includes('viết') || input.includes('c++') || input.includes('python') || input.includes('java')) {
      return `Mình có thể hỗ trợ viết khung code cho bài “${problemTitle}”. Hãy cho mình ngôn ngữ bạn đang dùng để mình đưa template phù hợp.`;
    }
    if (input.includes('đề bài') || input.includes('ý nghĩa')) {
      return `Đây là bài tập về ${problemTitle}. Hãy đọc kỹ ví dụ và xác định hành vi mong muốn trước khi viết code.`;
    }
    return `Mình có thể hỗ trợ bạn hiểu bài “${problemTitle}” và gợi ý cách giải. Hãy thử hỏi: “gợi ý”, “độ phức tạp” hoặc “viết code mẫu”.`;
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
  const highlighted = useMemo(() => highlight(code, lang), [code, lang]);

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
          <h1 className="mt-3 text-2xl font-bold">Không tìm thấy bài tập</h1>
          <p className="mt-3 text-sm text-(--ws-muted)">Mã bài này không tồn tại hoặc đã bị xóa.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-(--ws-bg) text-(--ws-text) px-6">
        <div className="max-w-lg w-full rounded-3xl border border-(--ws-border) bg-(--ws-panel) p-8 text-center shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-(--ws-faint)">Lỗi tải dữ liệu</p>
          <h1 className="mt-3 text-2xl font-bold">Không thể tải đề bài</h1>
          <p className="mt-3 text-sm text-(--ws-muted)">Vui lòng thử lại sau.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full text-(--ws-text)">
      {/* problem header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-(--ws-border) bg-(--ws-panel) flex-wrap">
          <h1 className="text-[17px] font-bold">{problemTitle}</h1>
          <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-md ${diffChip}`}>{problemDifficulty === 'EASY' ? 'Dễ' : problemDifficulty === 'MEDIUM' ? 'Trung bình' : 'Khó'}</span>
          {solved && (
            <span className="flex items-center gap-1 text-[12px] font-semibold text-(--ws-ok)">
              <CheckCircle2 size={14} /> Đã hoàn thành
            </span>
          )}
          <div className="flex-1" />
          <button
            onClick={() => setShowGuide(true)}
            className="p-2 rounded-lg border border-(--ws-border) text-(--ws-muted) hover:text-(--ws-accent) hover:border-(--ws-accent) transition-colors"
            title="Hướng dẫn sử dụng"
          >
            <HelpCircle size={15} />
          </button>
          <div className="flex items-center rounded-lg border border-(--ws-border) overflow-hidden">
            {([['split', <Columns size={14} key="c" />], ['statement', <FileText size={14} key="f" />], ['editor', <Code size={14} key="e" />]] as [LayoutMode, React.ReactNode][]).map(([mode, icon]) => (
              <button
                key={mode}
                onClick={() => setLayout(mode)}
                className={`px-2.5 py-2 transition-colors ${layout === mode ? 'bg-(--ws-accent-soft) text-(--ws-accent)' : 'text-(--ws-muted) hover:text-(--ws-text)'}`}
                title={mode === 'split' ? 'Chia đôi' : mode === 'statement' ? 'Chỉ đề bài' : 'Chỉ editor'}
              >
                {icon}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAssistant((v) => !v)}
            className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12.5px] font-medium transition-colors ${showAssistant ? 'border-(--ws-accent) text-(--ws-accent) bg-(--ws-accent-soft)' : 'border-(--ws-border) text-(--ws-muted) hover:text-(--ws-text) hover:border-(--ws-accent)'}`}
          >
            <MessageCircle size={14} /> {showAssistant ? 'Ẩn trợ lý' : 'Mở trợ lý'}
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
              {p === 'statement' ? 'Đề bài' : 'Code'}
            </button>
          ))}
        </div>

        {/* ============ SPLIT BODY ============ */}
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex min-h-0 min-w-0">
            {/* ---- statement pane ---- */}
            {(layout !== 'editor') && (
              <section
                className={`overflow-y-auto ws-editor-scroll bg-(--ws-bg) ${
                  layout === 'split'
                    ? `${mobilePane === 'statement' ? 'block' : 'hidden'} md:block md:w-1/2 border-r border-(--ws-border)`
                    : 'w-full'
                }`}
              >
              <div className="px-7 py-6 max-w-3xl">
                {/* limits */}
                <div className="grid grid-cols-3 gap-6 pb-5 border-b border-(--ws-border)">
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-widest text-(--ws-faint) mb-1.5">Thời gian giới hạn</p>
                    <p className="text-[15px] font-bold font-mono">{apiProblem?.time_limit ?? '—'} ms</p>
                  </div>
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-widest text-(--ws-faint) mb-1.5">Bộ nhớ giới hạn</p>
                    <p className="text-[15px] font-bold font-mono">{apiProblem?.memory_limit ?? '—'} MB</p>
                  </div>
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-widest text-(--ws-faint) mb-1.5">Điểm tối đa</p>
                    <p className="text-[15px] font-bold font-mono">{problemPoints}</p>
                  </div>
                </div>

                <button
                  onClick={downloadStatement}
                  className="mt-5 flex items-center gap-1.5 text-[13px] font-medium text-(--ws-accent) hover:underline"
                >
                  <Download size={14} /> Tải đề gốc
                </button>

                <h2 className="mt-6 mb-5 text-[26px] font-extrabold leading-tight">{problemTitle}</h2>

                {problemDescription && (
                  <div className="mb-7 rounded-xl border border-(--ws-border) bg-(--ws-panel) p-5">
                    <ReactMarkdown>{problemDescription}</ReactMarkdown>
                  </div>
                )}

                {/* samples in statement (dữ liệu thật từ test_cases không ẩn) */}
                {problemSamples.length > 0 && (
                  <>
                    <h3 className="text-[19px] font-bold mb-3">Ví dụ</h3>
                    {problemSamples.map((s, i) => (
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
                  </>
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
                <div className="flex items-center rounded-lg border border-(--ws-border) overflow-hidden text-[12.5px] font-semibold">
                  <button className="px-3 py-1.5 bg-(--ws-accent-soft) text-(--ws-accent)">Viết code</button>
                  <label className="px-3 py-1.5 text-(--ws-muted) hover:text-(--ws-text) cursor-pointer">
                    Tải file
                    <input type="file" accept=".cpp,.py,.java,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
                  </label>
                </div>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Lang)}
                  className="px-2.5 py-1.5 bg-(--ws-panel2) border border-(--ws-border) rounded-lg text-[12.5px] font-medium focus:outline-none focus:border-(--ws-accent)"
                >
                  {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
                    <option key={l} value={l}>{LANG_LABELS[l]}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-(--ws-border) text-[12.5px] text-(--ws-muted) cursor-pointer hover:text-(--ws-text)">
                  <input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} className="accent-(--ws-accent)" />
                  Xuống dòng
                </label>
                <button
                  onClick={() => onCodeChange(DEFAULT_TEMPLATES[lang])}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-(--ws-border) text-[12.5px] text-(--ws-muted) hover:text-(--ws-text) transition-colors"
                >
                  <RotateCcw size={13} /> Đặt lại
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
                  <ClipboardPaste size={13} /> Dán vào
                </button>
                <label className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-semibold text-(--ws-accent) hover:bg-(--ws-accent-soft) transition-colors cursor-pointer">
                  <Upload size={13} /> Tải lên
                  <input type="file" accept=".cpp,.py,.java,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
                </label>
                <span className={`text-[11.5px] ${saveState === 'saved' ? 'text-(--ws-faint)' : 'text-(--ws-warn)'}`}>
                  {saveState === 'saved' ? 'Đã lưu' : saveState === 'saving' ? 'Đang lưu…' : 'Chưa lưu'}
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
                    {lineCount} dòng • {code.length} ký tự • {LANG_LABELS[lang]}
                  </span>
                )}
              </div>

              {/* code area */}
              <div className="relative flex-1 min-h-0 overflow-hidden" style={{ fontSize }}>
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

              {/* ============ bottom panel ============ */}
              <div className="border-t border-(--ws-border) bg-(--ws-panel) flex flex-col h-64">
                <div className="flex items-center gap-1 px-3 pt-2 border-b border-(--ws-border-soft)">
                  {([
                    ['tests', 'Test mẫu', <FlaskConical size={13} key="i" />],
                    ['console', 'Console', <Terminal size={13} key="i" />],
                    ['results', 'Kết quả', <CheckCircle2 size={13} key="i" />],
                    ['debug', 'Debug', <Bug size={13} key="i" />],
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
                  <div className="flex items-center gap-2 pb-1.5">
                    <button
                      onClick={runSamples}
                      disabled={running || judging}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--ws-border) text-[12.5px] font-semibold text-(--ws-text) hover:border-(--ws-accent) hover:text-(--ws-accent) transition-colors disabled:opacity-50"
                    >
                      {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Chạy
                    </button>
                    <button
                      onClick={submit}
                      disabled={isSubmitLocked}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-(--ws-accent) text-[#062a25] text-[12.5px] font-bold hover:brightness-110 transition-all disabled:opacity-50 shadow-[0_0_20px_var(--ws-accent-soft)]"
                    >
                      {judging ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} {cooldownSeconds > 0 ? `Nộp bài (${cooldownSeconds}s)` : 'Nộp bài'}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto ws-editor-scroll p-4">
                  {judging && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-[11.5px] text-(--ws-muted) mb-1.5">
                        <span>Đang chấm {Math.round(judgeProgress)}%</span>
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
                          <p className="text-[10.5px] font-bold uppercase tracking-widest text-(--ws-faint) mb-2">Nhóm {i + 1}</p>
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
                          {s.note && <p className="mt-1.5 text-[11.5px] italic text-(--ws-faint)">{s.note}</p>}
                        </div>
                      ))}
                      <p className="text-[11.5px] italic text-(--ws-faint)">
                        Diff sẽ hiển thị sau khi chạy custom input trên case này (mỗi trường thử).
                      </p>
                    </div>
                  )}

                  {bottomTab === 'console' && (
                    <div className="font-mono text-[12.5px] leading-6 space-y-0.5">
                      {consoleLines.length === 0 && <p className="text-(--ws-faint)">Console trống — nhấn "Chạy" để thực thi code với test mẫu.</p>}
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
                        <p className="text-(--ws-faint) text-[13px]">Chưa có kết quả chấm — nhấn "Nộp bài" để gửi lên hệ thống.</p>
                      ) : (
                        <>
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-4 font-bold text-[13px] ${
                            finalVerdict === 'AC' ? 'bg-(--ws-accent-soft) text-(--ws-ok)' : 'bg-red-500/10 text-(--ws-danger)'
                          }`}>
                            {finalVerdict === 'AC' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                            {finalVerdict === 'AC' ? `Accepted — ${problemPoints}/${problemPoints} điểm` : finalVerdict === 'TLE' ? 'Time Limit Exceeded' : 'Wrong Answer'}
                          </div>
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                            {testVerdicts.map((t) => (
                              <div
                                key={t.id}
                                title={`Test ${t.id}: ${t.status} • ${t.time}ms • ${t.memory}MB`}
                                className={`rounded-lg border px-2 py-2 text-center transition-transform hover:scale-105 ${
                                  t.status === 'AC'
                                    ? 'border-(--ws-ok)/40 bg-(--ws-ok)/10 text-(--ws-ok)'
                                    : 'border-(--ws-danger)/40 bg-(--ws-danger)/10 text-(--ws-danger)'
                                }`}
                              >
                                <p className="text-[10px] font-bold">#{t.id}</p>
                                <p className="text-[13px] font-extrabold">{t.status}</p>
                                <p className="text-[9.5px] opacity-75">{t.time}ms</p>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {bottomTab === 'debug' && (
                    <div className="text-[13px] text-(--ws-muted) space-y-2">
                      <p className="flex items-center gap-2 text-(--ws-text) font-semibold"><Bug size={14} /> Trình gỡ lỗi</p>
                      <p>Không có ngoại lệ nào được ghi nhận ở lần chạy gần nhất.</p>
                      <p className="text-[12px] text-(--ws-faint)">Mẹo: dùng Console để xem output từng test và đối chiếu với đầu ra kỳ vọng ở tab Test mẫu.</p>
                    </div>
                  )}
                </div>
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
                    <p className="text-[11px] text-(--ws-faint)">Trợ lý AI cho bài hiện tại</p>
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
                      Đang suy nghĩ...
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
                    placeholder="Hỏi về đề bài hoặc cách giải..."
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
        className="fixed bottom-4 right-4 z-85 flex lg:hidden items-center gap-2 rounded-full bg-(--ws-accent) px-4 py-3 text-[13px] font-semibold text-[#062a25] shadow-xl transition-transform hover:scale-105"
      >
        <MessageCircle size={16} />
        Trợ lý AI
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
                    Đang suy nghĩ...
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
                  placeholder="Hỏi về đề bài hoặc cách giải..."
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

      {/* ============ SOLUTION MODAL đã được gỡ bỏ ============
          Backend không cung cấp lời giải mẫu cho sinh viên (đúng theo
          nguyên tắc học thuật), nên nút "Xem lời giải" và modal tương ứng
          đã được xóa thay vì hiển thị dữ liệu giả. */}

      {/* ============ GUIDE MODAL ============ */}
      {showGuide && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-90 flex items-center justify-center p-4" onClick={() => setShowGuide(false)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--ws-border)">
              <h3 className="font-bold text-[15px]">Hướng dẫn sử dụng</h3>
              <button onClick={() => setShowGuide(false)} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3 text-[13.5px] leading-6 text-(--ws-muted)">
              {[
                ['⌘K', 'Mở ô tìm kiếm bài tập từ bất kỳ đâu.'],
                ['Chạy', 'Thực thi code với các test mẫu ở bảng dưới editor.'],
                ['Nộp bài', 'Gửi code lên máy chấm với 8 test bí mật.'],
                ['Đặt lại', 'Khôi phục template mặc định của ngôn ngữ đang chọn.'],
                ['Tải lên / Dán vào', 'Nạp code từ file hoặc clipboard vào editor.'],
                ['3 nút góc phải', 'Chuyển giữa chế độ chia đôi / chỉ đề / chỉ code.'],
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
    </div>
  );
}
