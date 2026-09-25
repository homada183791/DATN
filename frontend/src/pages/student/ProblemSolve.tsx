import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useContributed } from '../../context/ContributedContext';
import { problems, submissions } from '../../data/mockData';
import { getDetail, LANG_LABELS, Lang, ProblemDetail } from '../../data/problemDetails';
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
} from 'lucide-react';

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

const now = () => new Date().toLocaleTimeString('en-GB', { hour12: false });

export default function ProblemSolve() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();
  const { contributed } = useContributed();

  const defaultProblem = problems[2];
  const builtinProblem = problems.find((p) => p.id === id);
  const contributedProblem = contributed.find((p) => p.id === id);
  const problem = builtinProblem
    ?? (contributedProblem
      ? {
          id: contributedProblem.id,
          title: contributedProblem.title,
          difficulty: contributedProblem.difficulty,
          category: contributedProblem.category,
          solvedCount: 0,
          submissionCount: 0,
          points: contributedProblem.points,
          tags: [contributedProblem.category.toLowerCase().replace(/\s+/g, '-')],
        }
      : defaultProblem);

  const detail: ProblemDetail = useMemo(() => {
    const base = getDetail(problem.id, problem.title, problem.points);
    if (!contributedProblem || builtinProblem) return base;
    return {
      ...base,
      code: `COMM-${contributedProblem.id.slice(-4).toUpperCase()}`,
      points: contributedProblem.points,
      sections: [
        {
          paragraphs: [
            contributedProblem.statement || t('problemSolve.noDetailContent'),
          ],
        },
      ],
      samples: [
        {
          input: contributedProblem.sampleInput || t('problemSolve.noSampleInput'),
          output: contributedProblem.sampleOutput || t('problemSolve.noSampleOutput'),
        },
      ],
    };
  }, [problem.id, problem.title, problem.points, contributedProblem, builtinProblem]);

  /* ui state */
  const [layout, setLayout] = useState<LayoutMode>('split');
  const [mobilePane, setMobilePane] = useState<'statement' | 'editor'>('statement');
  const [showSolution, setShowSolution] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const hasDocument = typeof document !== 'undefined';

  /* editor state */
  const [lang, setLang] = useState<Lang>('cpp');
  const [code, setCode] = useState(() =>
    localStorage.getItem(`jh-code-${problem.id}-cpp`) ?? detail.templates.cpp
  );
  const [wrap, setWrap] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [intelli, setIntelli] = useState(true);
  const [saveState, setSaveState] = useState<'saved' | 'unsaved' | 'saving'>('saved');

  /* judge state */
  const [bottomTab, setBottomTab] = useState<BottomTab>('tests');
  const [bottomHeight, setBottomHeight] = useState(256);
  const COLLAPSED_HEIGHT = 44;
  const bottomCollapsed = bottomHeight <= COLLAPSED_HEIGHT;
  const prevHeightRef = useRef(256);
  const resizingRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const startBottomResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Đo đúng khoảng trống thực tế còn lại từ vị trí thanh kéo tới đáy màn
    // hình — tránh trường hợp trừ cứng 1 con số ước lượng khiến hàng tab bị
    // đẩy chìm khỏi vùng nhìn thấy khi các thanh phía trên (topbar, tiêu đề
    // bài, thanh công cụ...) cao thấp khác nhau tuỳ màn hình.
    const handleTop = e.currentTarget.getBoundingClientRect().top;
    const maxHeight = Math.max(window.innerHeight - handleTop - 8, COLLAPSED_HEIGHT);

    resizingRef.current = { startY: e.clientY, startHeight: bottomHeight };
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    function onMouseMove(ev: MouseEvent) {
      const drag = resizingRef.current;
      if (!drag) return;
      const delta = drag.startY - ev.clientY;
      const next = Math.min(Math.max(drag.startHeight + delta, COLLAPSED_HEIGHT), maxHeight);
      setBottomHeight(next);
      if (next > COLLAPSED_HEIGHT) prevHeightRef.current = next;
    }
    function onMouseUp() {
      resizingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [bottomHeight]);

  function toggleBottomCollapsed() {
    if (bottomCollapsed) {
      setBottomHeight(prevHeightRef.current || 256);
    } else {
      prevHeightRef.current = bottomHeight;
      setBottomHeight(COLLAPSED_HEIGHT);
    }
  }

  const [samples, setSamples] = useState(detail.samples.map((s) => ({ ...s })));
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [running, setRunning] = useState(false);
  const [judging, setJudging] = useState(false);
  const [judgeProgress, setJudgeProgress] = useState(0);
  const [testVerdicts, setTestVerdicts] = useState<TestVerdict[]>([]);
  const [finalVerdict, setFinalVerdict] = useState<string | null>(null);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showAssistantMobile, setShowAssistantMobile] = useState(false);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      id: 1,
      role: 'assistant',
      content: t('problemSolve.assistantWelcome', { title: problem.title }),
    },
  ]);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number | null>(null);

  /* load code when problem/lang changes */
  useEffect(() => {
    const saved = localStorage.getItem(`jh-code-${problem.id}-${lang}`);
    setCode(saved ?? detail.templates[lang]);
    setSaveState(saved ? 'saved' : 'unsaved');
    setTestVerdicts([]);
    setFinalVerdict(null);
    setConsoleLines([]);
    setSamples(detail.samples.map((s) => ({ ...s })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem.id, lang]);

  useEffect(() => {
    setAssistantMessages([
      {
        id: Date.now(),
        role: 'assistant',
        content: t('problemSolve.assistantWelcome', { title: problem.title }),
      },
    ]);
    setShowAssistant(false);
    setShowAssistantMobile(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem.id]);

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
      localStorage.setItem(`jh-code-${problem.id}-${lang}`, v);
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

  /* -------- simulated judging -------- */
  const codeLooksCorrect = detail.successPattern.test(code) && code.trim().length > 30;

  const hashTime = (seed: number) => 4 + ((code.length * 7 + seed * 13) % 46);

  const runSamples = async () => {
    setRunning(true);
    setBottomTab('console');
    setConsoleLines([]);
    pushConsole(`$ judge --run ${detail.code} --lang ${LANG_LABELS[lang]}`, 'sys');
    pushConsole(`Compiling ${LANG_LABELS[lang]} source...`, 'info');
    await new Promise((r) => setTimeout(r, 650));
    if (code.trim().length < 20) {
      pushConsole(t('problemSolve.consoleNoMain'), 'err');
      setRunning(false);
      return;
    }
    pushConsole(t('problemSolve.consoleCompileOk'), 'ok');
    for (let i = 0; i < samples.length; i++) {
      await new Promise((r) => setTimeout(r, 380));
      const ok = codeLooksCorrect;
      pushConsole(
        ok
          ? `Test mẫu ${i + 1}: OK (${hashTime(i)}ms, ${(1 + (i % 3) * 0.4).toFixed(1)} MB)`
          : `Test mẫu ${i + 1}: WRONG ANSWER — đầu ra khác kỳ vọng.`,
        ok ? 'ok' : 'err'
      );
    }
    setRunning(false);
  };

  const submit = async () => {
    setJudging(true);
    setBottomTab('console');
    setConsoleLines([]);
    setFinalVerdict(null);
    setTestVerdicts([]);
    setJudgeProgress(0);
    pushConsole(`$ judge --submit ${detail.code} --lang ${LANG_LABELS[lang]}`, 'sys');
    pushConsole(t('problemSolve.consoleSubmitting'), 'info');
    await new Promise((r) => setTimeout(r, 600));
    pushConsole('Compiling... OK', 'ok');
    const total = 8;
    const verdicts: TestVerdict[] = [];
    for (let i = 0; i < total; i++) {
      await new Promise((r) => setTimeout(r, 300));
      setJudgeProgress(((i + 1) / total) * 100);
      const fail = !codeLooksCorrect && i >= 2;
      const tle = !fail && codeLooksCorrect === false && i === 5;
      const status: TestVerdict['status'] = fail ? 'WA' : tle ? 'TLE' : 'AC';
      const t = hashTime(i + 11);
      verdicts.push({ id: i + 1, status, time: t, memory: +(1.2 + (i % 4) * 0.7).toFixed(1) });
      pushConsole(
        status === 'AC'
          ? `Test ${i + 1}/${total}: Accepted (${t}ms)`
          : status === 'WA'
          ? `Test ${i + 1}/${total}: Wrong Answer`
          : `Test ${i + 1}/${total}: Time Limit Exceeded`,
        status === 'AC' ? 'ok' : 'err'
      );
    }
    setTestVerdicts(verdicts);
    const allAC = verdicts.every((v) => v.status === 'AC');
    setFinalVerdict(allAC ? 'AC' : verdicts.some((v) => v.status === 'TLE') ? 'TLE' : 'WA');
    setBottomTab('results');
    setJudging(false);
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
    reader.onload = () => onCodeChange(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  const downloadStatement = () => {
    const text = detail.sections
      .map((s) => `${s.heading ? `## ${s.heading}\n` : ''}${(s.paragraphs ?? []).join('\n')}${(s.bullets ?? []).map((b) => `\n- ${b}`).join('')}`)
      .join('\n\n');
    const blob = new Blob([`# ${problem.title} (${detail.code})\n\n${text}`], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${detail.code}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const getAssistantReply = (text: string) => {
    const input = text.toLowerCase();
    if (input.includes('gợi ý') || input.includes('hint') || input.includes('ý tưởng')) {
      return `Gợi ý cho ${problem.title}: hãy bắt đầu bằng cách phân tích đầu vào, đầu ra và các trường hợp biên. Sau đó, thử xây dựng một giải pháp đơn giản trước khi tối ưu.`;
    }
    if (input.includes('độ phức tạp') || input.includes('complex')) {
      return `Bạn có thể ưu tiên giải pháp có độ phức tạp tuyến tính hoặc logarit nếu phù hợp. Hãy chú ý đến số lần duyệt dữ liệu và bộ nhớ sử dụng.`;
    }
    if (input.includes('code') || input.includes('viết') || input.includes('c++') || input.includes('python') || input.includes('java')) {
      return `Mình có thể hỗ trợ viết khung code cho ${detail.code}. Hãy cho mình ngôn ngữ bạn đang dùng để mình đưa template phù hợp.`;
    }
    if (input.includes('đề bài') || input.includes('ý nghĩa')) {
      return `Đây là bài tập về ${problem.title}. Hãy đọc kỹ ví dụ và xác định hành vi mong muốn trước khi viết code.`;
    }
    return `Mình có thể hỗ trợ bạn hiểu bài “${problem.title}” và gợi ý cách giải. Hãy thử hỏi: “gợi ý”, “độ phức tạp” hoặc “viết code mẫu”.`;
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

  const solved = submissions.some((s) => s.userId === user?.id && s.problemId === problem.id && s.verdict === 'AC');

  const lineCount = code.split('\n').length;
  const highlighted = useMemo(() => highlight(code, lang), [code, lang]);

  const diffChip =
    problem.difficulty === 'Easy'
      ? 'text-[var(--ws-ok)] bg-[color:var(--ws-accent-soft)]'
      : problem.difficulty === 'Medium'
      ? 'text-[var(--ws-warn)] bg-[color:var(--ws-accent-soft)]'
      : 'text-[var(--ws-danger)] bg-[color:var(--ws-accent-soft)]';

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full text-[var(--ws-text)]">
      {/* problem header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--ws-border)] bg-[var(--ws-panel)] flex-wrap">
          <span className="text-[11px] font-bold tracking-wider px-2.5 py-1 rounded-md bg-[var(--ws-accent-soft)] text-[var(--ws-accent)]">
            {detail.code}
          </span>
          <h1 className="text-[17px] font-bold">{problem.title}</h1>
          <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-md ${diffChip}`}>{problem.difficulty === 'Easy' ? t('instructorHomework.difficultyEasyFull') : problem.difficulty === 'Medium' ? t('instructorHomework.difficultyMediumFull') : t('instructorHomework.difficultyHard')}</span>
          {solved && (
            <span className="flex items-center gap-1 text-[12px] font-semibold text-[var(--ws-ok)]">
              <CheckCircle2 size={14} /> {t('studentHomework.completed')}
            </span>
          )}
          <div className="flex-1" />
          <button
            onClick={() => setShowGuide(true)}
            className="p-2 rounded-lg border border-[var(--ws-border)] text-[var(--ws-muted)] hover:text-[var(--ws-accent)] hover:border-[var(--ws-accent)] transition-colors"
            title={t("problemSolve.usageGuide")}
          >
            <HelpCircle size={15} />
          </button>
          <button
            onClick={() => setShowSolution(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--ws-border)] text-[12.5px] font-medium text-[var(--ws-muted)] hover:text-[var(--ws-text)] hover:border-[var(--ws-accent)] transition-colors"
          >
            <Eye size={14} /> {t('problemSolve.viewSolution')}
          </button>
          <div className="flex items-center rounded-lg border border-[var(--ws-border)] overflow-hidden">
            {([['split', <Columns size={14} key="c" />], ['statement', <FileText size={14} key="f" />], ['editor', <Code size={14} key="e" />]] as [LayoutMode, React.ReactNode][]).map(([mode, icon]) => (
              <button
                key={mode}
                onClick={() => setLayout(mode)}
                className={`px-2.5 py-2 transition-colors ${layout === mode ? 'bg-[var(--ws-accent-soft)] text-[var(--ws-accent)]' : 'text-[var(--ws-muted)] hover:text-[var(--ws-text)]'}`}
                title={mode === 'split' ? t('problemSolve.modeSplit') : mode === 'statement' ? t('problemSolve.modeStatementOnly') : t('problemSolve.modeEditorOnly')}
              >
                {icon}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAssistant((v) => !v)}
            className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12.5px] font-medium transition-colors ${showAssistant ? 'border-[var(--ws-accent)] text-[var(--ws-accent)] bg-[var(--ws-accent-soft)]' : 'border-[var(--ws-border)] text-[var(--ws-muted)] hover:text-[var(--ws-text)] hover:border-[var(--ws-accent)]'}`}
          >
            <MessageCircle size={14} /> {showAssistant ? t('problemSolve.hideAssistant') : t('problemSolve.openAssistant')}
          </button>
        </div>

        {/* mobile pane switch */}
        <div className="md:hidden flex border-b border-[var(--ws-border)] bg-[var(--ws-panel)]">
          {(['statement', 'editor'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setMobilePane(p)}
              className={`flex-1 py-2.5 text-[13px] font-semibold ${mobilePane === p ? 'text-[var(--ws-accent)] border-b-2 border-[var(--ws-accent)]' : 'text-[var(--ws-muted)]'}`}
            >
              {p === 'statement' ? t('problemSolve.statementTab') : 'Code'}
            </button>
          ))}
        </div>

        {/* ============ SPLIT BODY ============ */}
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex min-h-0 min-w-0">
            {/* ---- statement pane ---- */}
            {(layout !== 'editor') && (
              <section
                className={`overflow-y-auto ws-editor-scroll bg-[var(--ws-bg)] ${
                  layout === 'split'
                    ? `${mobilePane === 'statement' ? 'block' : 'hidden'} md:block md:w-1/2 border-r border-[var(--ws-border)]`
                    : 'w-full'
                }`}
              >
              <div className="px-7 py-6 max-w-3xl">
                {/* limits */}
                <div className="grid grid-cols-3 gap-6 pb-5 border-b border-[var(--ws-border)]">
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-widest text-[var(--ws-faint)] mb-1.5">{t('problemSolve.timeLimit')}</p>
                    <p className="text-[15px] font-bold font-mono">{detail.timeLimit}</p>
                  </div>
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-widest text-[var(--ws-faint)] mb-1.5">{t('problemSolve.memoryLimit')}</p>
                    <p className="text-[15px] font-bold font-mono">{detail.memoryLimit}</p>
                  </div>
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-widest text-[var(--ws-faint)] mb-1.5">{t('problemSolve.maxScore')}</p>
                    <p className="text-[15px] font-bold font-mono">{detail.points}</p>
                  </div>
                </div>

                <button
                  onClick={downloadStatement}
                  className="mt-5 flex items-center gap-1.5 text-[13px] font-medium text-[var(--ws-accent)] hover:underline"
                >
                  <Download size={14} /> {t('problemSolve.downloadOriginal')}
                </button>

                <h2 className="mt-6 mb-5 text-[26px] font-extrabold leading-tight">{problem.title}</h2>

                {detail.sections.map((sec, i) => (
                  <div key={i} className="mb-7">
                    {sec.heading && <h3 className="text-[19px] font-bold mb-3">{sec.heading}</h3>}
                    {sec.paragraphs?.map((p, j) => (
                      <p key={j} className="text-[14.5px] leading-7 text-[var(--ws-text)]/90 mb-2">{p}</p>
                    ))}
                    {sec.bullets && (
                      <ul className="space-y-2 ml-1">
                        {sec.bullets.map((b, j) => (
                          <li key={j} className="flex gap-2.5 text-[14.5px] leading-7">
                            <span className="mt-[11px] w-1.5 h-1.5 rounded-full bg-[var(--ws-accent)] flex-shrink-0" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {sec.table && (
                      <div className="overflow-hidden rounded-lg border border-[var(--ws-border)]">
                        <table className="w-full text-[13.5px]">
                          <thead>
                            <tr className="bg-[var(--ws-panel2)]">
                              {sec.table.head.map((h, j) => (
                                <th key={j} className="text-left px-4 py-2.5 font-bold">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sec.table.rows.map((r, j) => (
                              <tr key={j} className="border-t border-[var(--ws-border)]">
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
                    <div className="rounded-lg border border-[var(--ws-border)] bg-[var(--ws-panel)] overflow-hidden">
                      <p className="px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-widest text-[var(--ws-faint)] bg-[var(--ws-panel2)]">Input</p>
                      <pre className="px-3 py-2.5 text-[13px] font-mono whitespace-pre-wrap">{s.input}</pre>
                    </div>
                    <div className="rounded-lg border border-[var(--ws-border)] bg-[var(--ws-panel)] overflow-hidden">
                      <p className="px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-widest text-[var(--ws-faint)] bg-[var(--ws-panel2)]">Output</p>
                      <pre className="px-3 py-2.5 text-[13px] font-mono whitespace-pre-wrap">{s.output}</pre>
                    </div>
                  </div>
                ))}
              </div>
              </section>
            )}

            {/* ---- editor pane ---- */}
            {(layout !== 'statement') && (
              <section
                className={`min-w-0 min-h-0 bg-[var(--ws-editor)] ${
                  layout === 'split'
                    ? `${mobilePane === 'editor' ? 'flex' : 'hidden'} md:flex md:w-1/2 flex-col`
                    : 'flex w-full flex-col'
                }`}
              >
              {/* editor toolbar */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--ws-border)] flex-wrap">
                <div className="flex items-center rounded-lg border border-[var(--ws-border)] overflow-hidden text-[12.5px] font-semibold">
                  <button className="px-3 py-1.5 bg-[var(--ws-accent-soft)] text-[var(--ws-accent)]">{t('problemSolve.writeCode')}</button>
                  <label className="px-3 py-1.5 text-[var(--ws-muted)] hover:text-[var(--ws-text)] cursor-pointer">
                    {t('problemSolve.uploadFile')}
                    <input type="file" accept=".cpp,.py,.java,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
                  </label>
                </div>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Lang)}
                  className="px-2.5 py-1.5 bg-[var(--ws-panel2)] border border-[var(--ws-border)] rounded-lg text-[12.5px] font-medium focus:outline-none focus:border-[var(--ws-accent)]"
                >
                  {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
                    <option key={l} value={l}>{LANG_LABELS[l]}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--ws-border)] text-[12.5px] text-[var(--ws-muted)] cursor-pointer hover:text-[var(--ws-text)]">
                  <input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} className="accent-[var(--ws-accent)]" />
                  {t('problemSolve.wordWrap')}
                </label>
                <button
                  onClick={() => onCodeChange(detail.templates[lang])}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--ws-border)] text-[12.5px] text-[var(--ws-muted)] hover:text-[var(--ws-text)] transition-colors"
                >
                  <RotateCcw size={13} /> {t('problemSolve.resetCode')}
                </button>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(+e.target.value)}
                  className="px-2 py-1.5 bg-[var(--ws-panel2)] border border-[var(--ws-border)] rounded-lg text-[12.5px] focus:outline-none"
                >
                  {[12, 13, 14, 16, 18].map((s) => <option key={s} value={s}>{s}px</option>)}
                </select>

                <div className="flex-1" />
                <button onClick={pasteIntoEditor} className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-semibold text-[var(--ws-accent)] hover:bg-[var(--ws-accent-soft)] transition-colors">
                  <ClipboardPaste size={13} /> {t('problemSolve.pasteIn')}
                </button>
                <label className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-semibold text-[var(--ws-accent)] hover:bg-[var(--ws-accent-soft)] transition-colors cursor-pointer">
                  <Upload size={13} /> {t('problemSolve.uploadBtn')}
                  <input type="file" accept=".cpp,.py,.java,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
                </label>
                <span className={`text-[11.5px] ${saveState === 'saved' ? 'text-[var(--ws-faint)]' : 'text-[var(--ws-warn)]'}`}>
                  {saveState === 'saved' ? t('problemSolve.saved') : saveState === 'saving' ? t('problemSolve.saving') : t('problemSolve.unsaved')}
                </span>
              </div>

              {/* intellisense row */}
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--ws-border-soft)]">
                <label className="flex items-center gap-2 text-[12.5px] text-[var(--ws-muted)] cursor-pointer select-none">
                  IntelliSense
                  <button
                    onClick={() => setIntelli(!intelli)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${intelli ? 'bg-[var(--ws-accent)]' : 'bg-[var(--ws-border)]'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${intelli ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </label>
                {intelli && (
                  <span className="text-[11px] text-[var(--ws-faint)] hidden sm:block">
                    {t('problemSolve.lineCount', { count: lineCount })} • {t('problemSolve.charCount', { count: code.length })} • {LANG_LABELS[lang]}
                  </span>
                )}
              </div>

              {/* code area */}
              <div className="relative flex-1 min-h-0 overflow-hidden" style={{ fontSize }}>
                {/* gutter */}
                <div
                  ref={gutterRef}
                  className="absolute left-0 top-0 bottom-0 w-12 overflow-hidden py-3 text-right pr-3 select-none font-mono leading-6 text-[var(--ws-gutter)]"
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
                  className={`absolute inset-0 left-12 m-0 py-3 pr-4 font-mono leading-6 pointer-events-none overflow-hidden text-[var(--ws-text)] ${
                    wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
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
                  className={`ws-editor-scroll absolute inset-0 left-12 w-[calc(100%-3rem)] h-full py-3 pr-4 bg-transparent font-mono leading-6 resize-none outline-none text-transparent caret-[var(--ws-accent)] selection:bg-[var(--ws-accent-soft)] ${
                    wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-auto'
                  }`}
                />
              </div>

              {/* ============ resize handle ============ */}
              <div
                onMouseDown={startBottomResize}
                className="group h-1.5 shrink-0 cursor-row-resize bg-transparent hover:bg-[var(--ws-accent-soft)] transition-colors relative"
                role="separator"
                aria-orientation="horizontal"
                aria-label={t("problemSolve.dragResizeLabel")}
              >
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-1 rounded-full bg-[var(--ws-border)] group-hover:bg-[var(--ws-accent)] transition-colors" />
              </div>

              {/* ============ bottom panel ============ */}
              <div
                className="border-t border-[var(--ws-border)] bg-[var(--ws-panel)] flex flex-col shrink-0 overflow-hidden"
                style={{ height: bottomHeight }}
              >
                <div className="flex items-center gap-1 px-3 pt-2 border-b border-[var(--ws-border-soft)] shrink-0">
                  {([
                    ['tests', t('problemSolve.tabSamples'), <FlaskConical size={13} key="i" />],
                    ['console', 'Console', <Terminal size={13} key="i" />],
                    ['results', t('problemSolve.tabResults'), <CheckCircle2 size={13} key="i" />],
                    ['debug', 'Debug', <Bug size={13} key="i" />],
                  ] as [BottomTab, string, React.ReactNode][]).map(([tab, label, icon]) => (
                    <button
                      key={tab}
                      onClick={() => setBottomTab(tab)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-semibold border-b-2 -mb-px transition-colors ${
                        bottomTab === tab
                          ? 'text-[var(--ws-accent)] border-[var(--ws-accent)]'
                          : 'text-[var(--ws-muted)] border-transparent hover:text-[var(--ws-text)]'
                      }`}
                    >
                      {icon} {label}
                      {tab === 'results' && finalVerdict && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${finalVerdict === 'AC' ? 'bg-[var(--ws-accent-soft)] text-[var(--ws-ok)]' : 'bg-red-500/15 text-[var(--ws-danger)]'}`}>
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--ws-border)] text-[12.5px] font-semibold text-[var(--ws-text)] hover:border-[var(--ws-accent)] hover:text-[var(--ws-accent)] transition-colors disabled:opacity-50"
                    >
                      {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} {t('problemSolve.runBtn')}
                    </button>
                    <button
                      onClick={submit}
                      disabled={running || judging}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--ws-accent)] text-[#062a25] text-[12.5px] font-bold hover:brightness-110 transition-all disabled:opacity-50 shadow-[0_0_20px_var(--ws-accent-soft)]"
                    >
                      {judging ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} {t('problemSolve.submitBtn')}
                    </button>
                    <button
                      onClick={toggleBottomCollapsed}
                      title={bottomCollapsed ? t('problemSolve.expandPanel') : t('problemSolve.collapsePanel')}
                      className="flex items-center justify-center w-7 h-7 rounded-lg border border-[var(--ws-border)] text-[var(--ws-muted)] hover:text-[var(--ws-text)] hover:border-[var(--ws-accent)] transition-colors"
                    >
                      {bottomCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {!bottomCollapsed && (
                <div className="flex-1 overflow-y-auto ws-editor-scroll p-4">
                  {judging && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-[11.5px] text-[var(--ws-muted)] mb-1.5">
                        <span>{t('problemSolve.judging', { percent: Math.round(judgeProgress) })}</span>
                        <span>{Math.round((judgeProgress / 100) * 8)}/8 tests</span>
                      </div>
                      <div className="h-1.5 bg-[var(--ws-panel2)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--ws-accent)] transition-all duration-300" style={{ width: `${judgeProgress}%` }} />
                      </div>
                    </div>
                  )}

                  {bottomTab === 'tests' && (
                    <div className="space-y-5">
                      {samples.map((s, i) => (
                        <div key={i}>
                          <p className="text-[10.5px] font-bold uppercase tracking-widest text-[var(--ws-faint)] mb-2">{t('problemSolve.groupLabel', { index: i + 1 })}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="relative rounded-lg border border-[var(--ws-border)] bg-[var(--ws-editor)] overflow-hidden group">
                              <textarea
                                value={s.input}
                                onChange={(e) => setSamples(samples.map((x, j) => (j === i ? { ...x, input: e.target.value } : x)))}
                                spellCheck={false}
                                className="w-full h-24 px-3 py-2.5 bg-transparent font-mono text-[12.5px] leading-5 resize-none outline-none text-[var(--ws-text)]"
                              />
                              <button
                                id={`copy-in-${i}`}
                                onClick={() => copyText(s.input, `copy-in-${i}`)}
                                className="absolute top-2 right-2 p-1.5 rounded-md bg-[var(--ws-panel2)] text-[var(--ws-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                            <div className="relative rounded-lg border border-[var(--ws-border)] bg-[var(--ws-editor)] overflow-hidden group">
                              <pre className="px-3 py-2.5 font-mono text-[12.5px] leading-5 whitespace-pre-wrap text-[var(--ws-text)]">{s.output}</pre>
                              <button
                                id={`copy-out-${i}`}
                                onClick={() => copyText(s.output, `copy-out-${i}`)}
                                className="absolute top-2 right-2 p-1.5 rounded-md bg-[var(--ws-panel2)] text-[var(--ws-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </div>
                          {s.note && <p className="mt-1.5 text-[11.5px] italic text-[var(--ws-faint)]">{s.note}</p>}
                        </div>
                      ))}
                      <p className="text-[11.5px] italic text-[var(--ws-faint)]">
                        {t('problemSolve.diffHint')}
                      </p>
                    </div>
                  )}

                  {bottomTab === 'console' && (
                    <div className="font-mono text-[12.5px] leading-6 space-y-0.5">
                      {consoleLines.length === 0 && <p className="text-[var(--ws-faint)]">{t('problemSolve.consoleEmpty')}</p>}
                      {consoleLines.map((l, i) => (
                        <p key={i} className="animate-slide-up">
                          <span className="text-[var(--ws-faint)] mr-2">[{l.time}]</span>
                          <span className={l.kind === 'ok' ? 'text-[var(--ws-ok)]' : l.kind === 'err' ? 'text-[var(--ws-danger)]' : l.kind === 'sys' ? 'text-[var(--ws-accent)]' : 'text-[var(--ws-text)]'}>
                            {l.msg}
                          </span>
                        </p>
                      ))}
                      {(running || judging) && <span className="inline-block w-2 h-4 bg-[var(--ws-accent)] animate-pulse-dot align-middle" />}
                    </div>
                  )}

                  {bottomTab === 'results' && (
                    <div>
                      {testVerdicts.length === 0 ? (
                        <p className="text-[var(--ws-faint)] text-[13px]">{t('problemSolve.noResultYet')}</p>
                      ) : (
                        <>
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-4 font-bold text-[13px] ${
                            finalVerdict === 'AC' ? 'bg-[var(--ws-accent-soft)] text-[var(--ws-ok)]' : 'bg-red-500/10 text-[var(--ws-danger)]'
                          }`}>
                            {finalVerdict === 'AC' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                            {finalVerdict === 'AC' ? t('problemSolve.acceptedLabel', { points: detail.points }) : finalVerdict === 'TLE' ? 'Time Limit Exceeded' : 'Wrong Answer'}
                          </div>
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                            {testVerdicts.map((tv) => (
                              <div
                                key={tv.id}
                                title={`Test ${tv.id}: ${tv.status} • ${tv.time}ms • ${tv.memory}MB`}
                                className={`rounded-lg border px-2 py-2 text-center transition-transform hover:scale-105 ${
                                  tv.status === 'AC'
                                    ? 'border-[var(--ws-ok)]/40 bg-[var(--ws-ok)]/10 text-[var(--ws-ok)]'
                                    : 'border-[var(--ws-danger)]/40 bg-[var(--ws-danger)]/10 text-[var(--ws-danger)]'
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
                    <div className="text-[13px] text-[var(--ws-muted)] space-y-2">
                      <p className="flex items-center gap-2 text-[var(--ws-text)] font-semibold"><Bug size={14} /> {t('problemSolve.debuggerTitle')}</p>
                      <p>{t('problemSolve.noExceptions')}</p>
                      <p className="text-[12px] text-[var(--ws-faint)]">{t('problemSolve.debugHint')}</p>
                    </div>
                  )}
                </div>
                )}
              </div>
              </section>
            )}
          </div>

          {showAssistant && (
            <aside className="hidden lg:flex w-[360px] border-l border-[var(--ws-border)] bg-[var(--ws-panel)] flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ws-border)] bg-[var(--ws-panel2)]">
                <div className="flex items-center gap-2">
                  <MessageCircle size={15} className="text-[var(--ws-accent)]" />
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--ws-text)]">AI Assistant</p>
                    <p className="text-[11px] text-[var(--ws-faint)]">{t('problemSolve.assistantSubtitle')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAssistant(false)}
                  className="rounded-lg p-1.5 text-[var(--ws-muted)] hover:bg-[var(--ws-panel)] hover:text-[var(--ws-text)]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto ws-editor-scroll p-3 space-y-2 bg-[var(--ws-bg)]">
                {assistantMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-[13px] leading-6 ${msg.role === 'user' ? 'bg-[var(--ws-accent)] text-[#062a25]' : 'bg-[var(--ws-panel)] text-[var(--ws-text)] border border-[var(--ws-border)]'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {assistantBusy && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl border border-[var(--ws-border)] bg-[var(--ws-panel)] px-3 py-2 text-[13px] text-[var(--ws-muted)]">
                      {t('problemSolve.thinking')}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={askAssistant} className="border-t border-[var(--ws-border)] bg-[var(--ws-panel)] p-3">
                <div className="flex items-center gap-2 rounded-xl border border-[var(--ws-border)] bg-[var(--ws-editor)] px-3 py-2">
                  <input
                    value={assistantInput}
                    onChange={(e) => setAssistantInput(e.target.value)}
                    placeholder={t('problemSolve.askPlaceholder')}
                    className="flex-1 bg-transparent text-[13px] text-[var(--ws-text)] outline-none placeholder:text-[var(--ws-faint)]"
                  />
                  <button type="submit" disabled={assistantBusy || !assistantInput.trim()} className="rounded-lg bg-[var(--ws-accent)] p-2 text-[#062a25] disabled:opacity-50">
                    <Send size={14} />
                  </button>
                </div>
              </form>
            </aside>
          )}
        </div>

      <button
        onClick={() => setShowAssistantMobile(true)}
        className="fixed bottom-4 right-4 z-[85] flex lg:hidden items-center gap-2 rounded-full bg-[var(--ws-accent)] px-4 py-3 text-[13px] font-semibold text-[#062a25] shadow-xl transition-transform hover:scale-105"
      >
        <MessageCircle size={16} />
        {t('problemSolve.aiAssistantTitle')}
      </button>

      {showAssistantMobile && (
        <div className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-[2px] lg:hidden" onClick={() => setShowAssistantMobile(false)}>
          <div className="absolute bottom-0 left-0 right-0 h-[72vh] rounded-t-2xl border-t border-x border-[var(--ws-border)] bg-[var(--ws-panel)] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ws-border)]">
              <div className="flex items-center gap-2">
                <MessageCircle size={15} className="text-[var(--ws-accent)]" />
                <p className="text-[13px] font-semibold">Leet Coach</p>
              </div>
              <button onClick={() => setShowAssistantMobile(false)} className="rounded-lg p-1.5 text-[var(--ws-muted)] hover:bg-[var(--ws-panel2)] hover:text-[var(--ws-text)]">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto ws-editor-scroll p-3 space-y-2 bg-[var(--ws-bg)]">
              {assistantMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-[13px] leading-6 ${msg.role === 'user' ? 'bg-[var(--ws-accent)] text-[#062a25]' : 'bg-[var(--ws-panel)] text-[var(--ws-text)] border border-[var(--ws-border)]'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {assistantBusy && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-[var(--ws-border)] bg-[var(--ws-panel)] px-3 py-2 text-[13px] text-[var(--ws-muted)]">
                    {t('problemSolve.thinking')}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={askAssistant} className="border-t border-[var(--ws-border)] bg-[var(--ws-panel)] p-3">
              <div className="flex items-center gap-2 rounded-xl border border-[var(--ws-border)] bg-[var(--ws-editor)] px-3 py-2">
                <input
                  value={assistantInput}
                  onChange={(e) => setAssistantInput(e.target.value)}
                  placeholder={t('problemSolve.askPlaceholder')}
                  className="flex-1 bg-transparent text-[13px] text-[var(--ws-text)] outline-none placeholder:text-[var(--ws-faint)]"
                />
                <button type="submit" disabled={assistantBusy || !assistantInput.trim()} className="rounded-lg bg-[var(--ws-accent)] p-2 text-[#062a25] disabled:opacity-50">
                  <Send size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ SOLUTION MODAL ============ */}
      {showSolution && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-[90] flex items-center justify-center p-4" onClick={() => setShowSolution(false)}>
          <div className="bg-[var(--ws-panel)] border border-[var(--ws-border)] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ws-border)]">
              <h3 className="font-bold text-[15px]">{t('problemSolve.referenceSolutionTitle', { title: problem.title })}</h3>
              <button onClick={() => setShowSolution(false)} className="text-[var(--ws-muted)] hover:text-[var(--ws-text)]"><X size={18} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-64px)]">
              <div className="flex items-center gap-2 mb-3 text-[12px] text-[var(--ws-muted)]">
                <Clock size={13} /> {detail.timeLimit}
                <Zap size={13} className="ml-3" /> {detail.memoryLimit}
              </div>
              <pre className="ws-dark bg-[#0b1210] border border-[var(--ws-border)] rounded-xl p-4 overflow-x-auto font-mono text-[12.5px] leading-6 text-[#e4ece8]" dangerouslySetInnerHTML={{ __html: highlight(detail.solutions[lang], lang) }} />
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ============ GUIDE MODAL ============ */}
      {showGuide && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-[90] flex items-center justify-center p-4" onClick={() => setShowGuide(false)}>
          <div className="bg-[var(--ws-panel)] border border-[var(--ws-border)] rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ws-border)]">
              <h3 className="font-bold text-[15px]">{t('problemSolve.usageGuide')}</h3>
              <button onClick={() => setShowGuide(false)} className="text-[var(--ws-muted)] hover:text-[var(--ws-text)]"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3 text-[13.5px] leading-6 text-[var(--ws-muted)]">
              {[
                ['⌘K', t('problemSolve.guideSearch')],
                [t('problemSolve.runBtn'), t('problemSolve.guideRun')],
                [t('problemSolve.submitBtn'), t('problemSolve.guideSubmit')],
                [t('problemSolve.resetCode'), t('problemSolve.guideReset')],
                [t('problemSolve.guideUploadPasteLabel'), t('problemSolve.guideUploadPaste')],
                [t('problemSolve.guideModeLabel'), t('problemSolve.guideMode')],
              ].map(([k, v], i) => (
                <div key={i} className="flex gap-3">
                  <span className="flex-shrink-0 text-[11px] font-bold px-2 py-0.5 h-fit rounded-md bg-[var(--ws-accent-soft)] text-[var(--ws-accent)]">{k}</span>
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
