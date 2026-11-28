import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Plus, Trash2, Eye, EyeOff,
  Clock, HardDrive, AlignLeft, FlaskConical, Loader2,
  AlertCircle, Upload, CheckCheck, FileCode, Sparkles, FileUp,
} from 'lucide-react';
import { CreateProblemDto, ProblemDifficulty, ProblemDto } from '../api/problems';
import { generateAiTestCases } from '../api/ai';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, LANGUAGE_CATEGORIES } from '../config/languages';
import ProblemImportModal from './ProblemImportModal';

interface ProblemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProblemDto, points?: number) => void;
  initialData?: ProblemDto | null;
  isLoading?: boolean;
  showPoints?: boolean;
  initialPoints?: number;
  titleText?: string;
  subtitleText?: string;
  submitText?: string;
  /** Khi soạn bài cho lớp (showPoints): nhận các bài tải từ tệp để gắn thẳng vào bài tập */
  /** true = bài tạo/tải từ tệp không đưa vào Ngân hàng bài tập (dùng cho kỳ thi, bài tập lớp) */
  privateProblem?: boolean;
  onImportedProblems?: (items: Array<{ created: ProblemDto; dto: CreateProblemDto }>) => void;
}

const DIFFICULTY_CONFIG = {
  EASY:   { color: 'text-(--ws-ok) bg-(--ws-ok-soft) border-(--ws-ok)/35 ring-(--ws-ok)/35' },
  MEDIUM: { color: 'text-(--ws-warn) bg-(--ws-warn-soft) border-(--ws-warn)/35 ring-(--ws-warn)/35' },
  HARD:   { color: 'text-(--ws-danger) bg-(--ws-danger-soft) border-(--ws-danger)/35 ring-(--ws-danger)/35' },
} as const;

const TIME_PRESETS = [500, 1000, 2000, 3000];
const MEM_PRESETS  = [64, 128, 256, 512];

/* ─────────────────────────────── styles ─────────────────────────────── */
const FIELD_BASE  = 'w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all text-(--ws-text) placeholder-(--ws-faint)';
const FIELD_IDLE  = 'border-(--ws-border) bg-(--ws-panel) focus:border-(--ws-accent) focus:ring-1 focus:ring-(--ws-accent)';
const FIELD_ERR   = 'border-(--ws-danger)/35 ring-1 ring-(--ws-danger)/35 bg-(--ws-danger-soft)';

export default function ProblemFormModal({
  isOpen, onClose, onSubmit, initialData, isLoading,
  showPoints = false,
  initialPoints = 100,
  titleText,
  subtitleText,
  submitText,
  onImportedProblems,
  privateProblem = false,
}: ProblemFormModalProps) {
  const { t } = useTranslation();
  const [title,            setTitle]            = useState('');
  const [description,      setDescription]      = useState('');
  const [difficulty,       setDifficulty]       = useState<ProblemDifficulty>('EASY');
  const [points,           setPoints]           = useState(initialPoints);
  const [timeLimit,        setTimeLimit]        = useState(1000);
  const [memoryLimit,      setMemoryLimit]      = useState(256);
  const [allowedLanguages, setAllowedLanguages] = useState<string[]>([]);
  const [testCases,        setTestCases]        = useState<CreateProblemDto['test_cases']>([]);
  const [activeTab,        setActiveTab]        = useState<'desc' | 'languages' | 'cases'>('desc');
  const [errors,           setErrors]           = useState<Record<string, string>>({});
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [bulkText,    setBulkText]    = useState('');
  const [bulkError,   setBulkError]   = useState('');
  const [confirmClearCases, setConfirmClearCases] = useState(false);

  // ── AI Testcase Generation States ──
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiStrategy, setAiStrategy] = useState<'FROM_DESCRIPTION' | 'FROM_SOLUTION'>('FROM_DESCRIPTION');
  const [aiSolutionCode, setAiSolutionCode] = useState('');
  const [aiSolutionLang, setAiSolutionLang] = useState('python');
  const [aiCount, setAiCount] = useState(5);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description);
        setDifficulty(initialData.difficulty);
        setTimeLimit(initialData.time_limit);
        setMemoryLimit(initialData.memory_limit);
        setAllowedLanguages(initialData.allowed_languages || []);
        setTestCases(
          initialData.test_cases?.map((tc) => ({
            input: tc.input,
            expected_output: tc.expected_output,
            is_hidden: tc.is_hidden,
          })) ?? []
        );
      } else {
        setTitle('');
        setDescription('');
        setDifficulty('EASY');
        setTimeLimit(1000);
        setMemoryLimit(256);
        setAllowedLanguages([]);
        setTestCases([]);
      }
      setPoints(initialPoints);
      setErrors({});
      setActiveTab('desc');
    }
  }, [initialData, isOpen, initialPoints]);

  if (!isOpen) return null;

  /* ── Validation ── */
  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim() || title.trim().length < 3) e.title = t('problemForm.titleMin');
    if (!description.trim())  e.description = t('problemForm.descriptionRequired');
    if (testCases.length === 0) e.cases = t('problemForm.testRequired');
    testCases.forEach((tc, i) => {
      if (!tc.input.trim())           e[`tc_input_${i}`] = t('problemForm.inputRequired');
      if (!tc.expected_output.trim()) e[`tc_out_${i}`]   = t('problemForm.outputRequired');
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      const hasCaseErr = Object.keys(errors).some(k => k.startsWith('tc_') || k === 'cases');
      const hasDescErr = !!(errors.title || errors.description);
      if (!hasDescErr && hasCaseErr) setActiveTab('cases');
      return;
    }
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      difficulty,
      time_limit: timeLimit,
      memory_limit: memoryLimit,
      allowed_languages: allowedLanguages,
      test_cases: testCases,
    }, showPoints ? points : undefined);
  };

  const addTestCase    = () => setTestCases([...testCases, { input: '', expected_output: '', is_hidden: false }]);
  const removeTestCase = (i: number) => setTestCases(testCases.filter((_, idx) => idx !== i));
  const updateTestCase = (i: number, field: keyof CreateProblemDto['test_cases'][0], value: unknown) => {
    const next = [...testCases];
    next[i] = { ...next[i], [field]: value };
    setTestCases(next);
  };

  /* ── Mẫu mô tả (song ngữ / đơn). Việc tải tệp đã tách sang ProblemImportModal ── */
  const handleInsertBilingualTemplate = () => {
    const template = `[Tiếng Việt]
### Mô tả bài toán
# TODO: Nhập mô tả chi tiết bài toán bằng tiếng Việt...

### Ví dụ 1:
Đầu vào: nums = [1, 2, 3]
Đầu ra: 6

### Ràng buộc:
- 1 <= nums.length <= 10^5
- -10^6 <= nums[i] <= 10^6

----------

[English]
### Problem Description
# TODO: Enter detailed problem statement in English...

### Example 1:
Input: nums = [1, 2, 3]
Output: 6

### Constraints:
- 1 <= nums.length <= 10^5
- -10^6 <= nums[i] <= 10^6
`;
    setDescription(template);
    setErrors((prev) => ({ ...prev, description: '' }));
  };

  const handleInsertTemplate = () => {
    const template = `### Mô tả bài toán
# TODO: Nhập mô tả chi tiết bài toán tại đây...

### Định dạng đầu vào (Input)
# TODO: Dòng đầu tiên chứa số nguyên N, dòng tiếp theo chứa các phần tử...

### Định dạng đầu ra (Output)
# TODO: In ra một số nguyên duy nhất là kết quả...

### Ràng buộc dữ liệu (Constraints)
- 1 <= N <= 10^5
- Giới hạn thời gian thực thi: 1000ms
- Giới hạn bộ nhớ: 256MB

### Ví dụ mẫu (Example 1)
**Đầu vào:**
\`\`\`
5
1 2 3 4 5
\`\`\`

**Đầu ra:**
\`\`\`
15
\`\`\`

**Giải thích:**
# TODO: 1 + 2 + 3 + 4 + 5 = 15
`;
    setDescription(template);
    setErrors((prev) => ({ ...prev, description: '' }));
  };

  /* ── Xử lý Test case: Tải lên tệp và hỗ trợ cú pháp ngắn gọn ── */
  const handleUploadTestFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || '');
      setBulkText(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleInsertBulkSample = () => {
    const sample = `# Cú pháp ngắn gọn: input => output (mỗi dòng một cặp)
1 2 => 3
5 10 => 15
-2 8 => 6
100 200 => 300
`;
    setBulkText(sample);
  };

  const handleParseBulk = () => {
    if (!bulkText.trim()) {
      setBulkError('Vui lòng dán nội dung hoặc tải lên file test cases.');
      return;
    }
    try {
      const trimmed = bulkText.trim();
      const parsedCases: CreateProblemDto['test_cases'] = [];

      // 1. Try JSON array
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const newCases = parsed.map((item: any) => ({
            input: String(item.input ?? item.in ?? '').trim(),
            expected_output: String(item.expected_output ?? item.output ?? item.out ?? '').trim(),
            is_hidden: Boolean(item.is_hidden ?? true),
          }));
          setTestCases((prev) => [...prev, ...newCases]);
          setShowBulkModal(false);
          setBulkText('');
          setBulkError('');
          return;
        }
      }

      // 2. Try delimiter regex for === INPUT === and === OUTPUT ===
      const regex = /===+\s*INPUT\s*===+([\s\S]*?)===+\s*OUTPUT\s*===+([\s\S]*?)(?====+\s*INPUT\s*===+|$)/gi;
      let match;
      while ((match = regex.exec(trimmed)) !== null) {
        const inp = match[1].trim();
        const out = match[2].trim();
        if (inp || out) {
          parsedCases.push({ input: inp, expected_output: out, is_hidden: true });
        }
      }

      // 3. Fallback: blocks separated by ---
      if (parsedCases.length === 0) {
        const blocks = trimmed.split(/---+/).filter((b) => b.trim());
        for (const block of blocks) {
          const ioMatch = block.split(/===+\s*OUTPUT\s*===+|output:/i);
          if (ioMatch.length === 2) {
            const inputPart = ioMatch[0].replace(/===+\s*INPUT\s*===+|input:/i, '').trim();
            const outputPart = ioMatch[1].trim();
            if (inputPart || outputPart) {
              parsedCases.push({ input: inputPart, expected_output: outputPart, is_hidden: true });
            }
          }
        }
      }

      // 4. Concise format: "input => output" or "input -> output" or "input | output"
      if (parsedCases.length === 0) {
        const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('//'));
        for (const line of lines) {
          if (line.includes('=>') || line.includes('->')) {
            const parts = line.split(/=>|->/);
            if (parts.length >= 2) {
              parsedCases.push({
                input: parts[0].trim().replace(/\\n/g, '\n'),
                expected_output: parts.slice(1).join('=>').trim().replace(/\\n/g, '\n'),
                is_hidden: true,
              });
            }
          } else if (line.includes('|')) {
            const parts = line.split('|');
            if (parts.length >= 2) {
              parsedCases.push({
                input: parts[0].trim().replace(/\\n/g, '\n'),
                expected_output: parts.slice(1).join('|').trim().replace(/\\n/g, '\n'),
                is_hidden: true,
              });
            }
          }
        }
      }

      // 5. Alternating lines: Line 1 = Input, Line 2 = Output (if even number of lines)
      if (parsedCases.length === 0) {
        const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('//'));
        if (lines.length >= 2 && lines.length % 2 === 0) {
          for (let i = 0; i < lines.length; i += 2) {
            parsedCases.push({ input: lines[i], expected_output: lines[i + 1], is_hidden: true });
          }
        }
      }

      if (parsedCases.length === 0) {
        setBulkError('Không nhận diện được test cases. Hỗ trợ:\n- Cú pháp gọn: input => output (Ví dụ: 1 2 => 3)\n- Cú pháp gạch đứng: input | output\n- Cặp khối: === INPUT === ... === OUTPUT ===\n- Mảng JSON: [{"input": "...", "expected_output": "..."}]');
        return;
      }

      setTestCases((prev) => [...prev, ...parsedCases]);
      setShowBulkModal(false);
      setBulkText('');
      setBulkError('');
    } catch (err: any) {
      setBulkError('Lỗi cú pháp: ' + (err.message || 'Không thể đọc dữ liệu'));
    }
  };

  /* ── Sinh Test cases tự động bằng AI ── */
  const handleGenerateAiTestCases = async () => {
    setIsAiGenerating(true);
    setAiError('');
    try {
      const res = await generateAiTestCases({
        title,
        description,
        solution_code: aiStrategy === 'FROM_SOLUTION' ? aiSolutionCode : undefined,
        language: aiSolutionLang,
        count: aiCount,
        strategy: aiStrategy,
      });
      if (res.test_cases?.length) {
        setTestCases((prev) => [
          ...prev,
          ...res.test_cases.map((tc) => ({
            input: tc.input,
            expected_output: tc.expected_output,
            is_hidden: tc.is_hidden,
          })),
        ]);
        setShowAiModal(false);
        setActiveTab('cases');
      } else {
        setAiError(t('problemForm.aiEmptyError'));
      }
    } catch (err: any) {
      setAiError(err.message || t('problemForm.aiFailedError'));
    } finally {
      setIsAiGenerating(false);
    }
  };

  const markAllHidden = (hidden: boolean) => {
    setTestCases((prev) => prev.map((tc) => ({ ...tc, is_hidden: hidden })));
  };

  const clearAllTestCases = () => {
    if (!confirmClearCases) {
      setConfirmClearCases(true);
      setTimeout(() => setConfirmClearCases(false), 3500);
      return;
    }
    setTestCases([]);
    setConfirmClearCases(false);
  };

  const isEdit = !!initialData;
  const caseErrCount = Object.keys(errors).filter(k => k.startsWith('tc_') || k === 'cases').length;

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      {/* ─── Modal shell — Warm cream, same as Homework modal ─── */}
      <div
        className="relative w-full max-w-4xl bg-(--ws-panel2) rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] border border-(--ws-border)"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--ws-border) shrink-0 bg-(--ws-panel2)">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-(--ws-accent)/10">
              <FlaskConical size={18} className="text-(--ws-accent)" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-(--ws-text) leading-tight">
                {titleText || (isEdit ? t('problemForm.editTitle') : t('problemForm.createTitle'))}
              </h2>
              <p className="text-xs text-(--ws-muted)">
                {subtitleText || (isEdit ? t('problemForm.updatePrefix', { title: initialData.title }) : t('problemForm.systemBank'))}
              </p>
            </div>
          </div>
          <button aria-label={t('common.close')}
            onClick={onClose}
            className="p-2 rounded-xl text-(--ws-muted) hover:bg-(--ws-hover) hover:text-(--ws-text) transition-colors"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* ── TABS ── */}
        <div className="flex border-b border-(--ws-border) shrink-0 bg-(--ws-panel2)">
          {([
            { key: 'desc'      as const, label: t('problemForm.statementInfo'), icon: AlignLeft,    err: !!(errors.title || errors.description), count: undefined },
            { key: 'languages' as const, label: 'Ngôn ngữ cho phép',           icon: FileCode,     err: false, count: allowedLanguages.length > 0 ? `${allowedLanguages.length}` : 'Tất cả' },
            { key: 'cases'     as const, label: 'Test Cases',                    icon: FlaskConical, err: caseErrCount > 0,                        count: testCases.length },
          ]).map(({ key, label, icon: Icon, err, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all border-b-2 ${
                activeTab === key
                  ? 'border-(--ws-accent) text-(--ws-accent)'
                  : 'border-transparent text-(--ws-muted) hover:text-(--ws-text)'
              }`}
            >
              <Icon size={15} />
              {label}
              {count !== undefined && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                  key === 'languages'
                    ? (allowedLanguages.length > 0 ? 'bg-(--ws-warn) text-(--ws-on-accent)' : 'bg-(--ws-ok) text-(--ws-on-accent)')
                    : 'bg-(--ws-accent) text-(--ws-on-accent)'
                }`}>
                  {count}
                </span>
              )}
              {err && <AlertCircle size={13} className="text-(--ws-danger) ml-0.5" />}
            </button>
          ))}
        </div>

        {/* ── BODY ── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto">

            {/* ─── TAB: Thông tin đề bài ─── */}
            {activeTab === 'desc' && (
              <div className="p-6 space-y-5">

                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-(--ws-text) mb-1.5">
                    {t('problemForm.titleLabel')} <span className="text-(--ws-danger)">*</span>
                  </label>
                  <input
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setErrors(p => ({ ...p, title: '' })); }}
                    placeholder={t('problemForm.titlePlaceholder')}
                    className={`${FIELD_BASE} ${errors.title ? FIELD_ERR : FIELD_IDLE}`}
                  />
                  {errors.title && (
                    <p className="mt-1 text-xs text-(--ws-danger) flex items-center gap-1">
                      <AlertCircle size={11} />{errors.title}
                    </p>
                  )}
                </div>

                {/* Difficulty & Points */}
                <div className={showPoints ? 'grid grid-cols-1 sm:grid-cols-3 gap-4' : ''}>
                  <div className={showPoints ? 'sm:col-span-2' : ''}>
                    <label className="block text-sm font-semibold text-(--ws-text) mb-2">{t('problemForm.difficulty')}</label>
                    <div className="flex gap-2">
                      {(Object.keys(DIFFICULTY_CONFIG) as ProblemDifficulty[]).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDifficulty(d)}
                          className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all ${
                            difficulty === d
                              ? DIFFICULTY_CONFIG[d].color + ' ring-2 shadow-sm'
                              : 'border-(--ws-border) text-(--ws-muted) bg-(--ws-panel) hover:border-(--ws-faint) hover:text-(--ws-text)'
                          }`}
                        >
                          {t(`problemForm.${d.toLowerCase()}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                  {showPoints && (
                    <div>
                      <label className="block text-sm font-semibold text-(--ws-text) mb-2">{t('problemForm.points')}</label>
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={points}
                        onChange={(e) => setPoints(Number(e.target.value))}
                        className={`${FIELD_BASE} ${FIELD_IDLE}`}
                        placeholder="100"
                      />
                    </div>
                  )}
                </div>

                {/* Limits */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Time */}
                  <div>
                    <label className="block text-sm font-semibold text-(--ws-text) mb-1.5">
                      <span className="flex items-center gap-1.5"><Clock size={13} className="text-(--ws-muted)" />{t('problemForm.timeLimit')}</span>
                    </label>
                    <input
                      type="number"
                      min="100"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(Number(e.target.value))}
                      className={`${FIELD_BASE} ${FIELD_IDLE}`}
                    />
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {TIME_PRESETS.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setTimeLimit(v)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                            timeLimit === v
                              ? 'bg-(--ws-accent) text-(--ws-on-accent) border-(--ws-accent)'
                              : 'border-(--ws-border) text-(--ws-muted) bg-(--ws-panel) hover:border-(--ws-accent) hover:text-(--ws-accent)'
                          }`}
                        >
                          {v}ms
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Memory */}
                  <div>
                    <label className="block text-sm font-semibold text-(--ws-text) mb-1.5">
                      <span className="flex items-center gap-1.5"><HardDrive size={13} className="text-(--ws-muted)" />{t('problemForm.memoryLimit')}</span>
                    </label>
                    <input
                      type="number"
                      min="16"
                      value={memoryLimit}
                      onChange={(e) => setMemoryLimit(Number(e.target.value))}
                      className={`${FIELD_BASE} ${FIELD_IDLE}`}
                    />
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {MEM_PRESETS.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setMemoryLimit(v)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                            memoryLimit === v
                              ? 'bg-(--ws-accent) text-(--ws-on-accent) border-(--ws-accent)'
                              : 'border-(--ws-border) text-(--ws-muted) bg-(--ws-panel) hover:border-(--ws-accent) hover:text-(--ws-accent)'
                          }`}
                        >
                          {v}MB
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <label className="text-sm font-semibold text-(--ws-text)">
                      {t('problemForm.description')}{' '}
                      <span className="text-(--ws-danger)">*</span>
                      <span className="ml-2 text-xs font-normal text-(--ws-muted)">{t('problemForm.markdown')}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleInsertBilingualTemplate}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-(--ws-accent)/30 bg-(--ws-accent)/5 text-(--ws-accent) hover:bg-(--ws-accent)/10 text-xs font-semibold transition-colors shadow-2xs"
                        title={t('problemForm.bilingualTemplateTitle')}
                      >
                        <FileCode size={13} className="text-(--ws-accent)" />
                        {t('problemForm.bilingualTemplate')}
                      </button>
                      <button
                        type="button"
                        onClick={handleInsertTemplate}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-(--ws-border) bg-(--ws-panel) text-(--ws-text) hover:text-(--ws-text) hover:bg-(--ws-hover) text-xs font-semibold transition-colors shadow-2xs"
                        title={t('problemForm.singleTemplateTitle')}
                      >
                        <FileCode size={13} className="text-(--ws-muted)" />
                        {t('problemForm.singleTemplate')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowImport(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-(--ws-border) bg-(--ws-panel) text-(--ws-text) hover:text-(--ws-text) hover:bg-(--ws-hover) text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                      >
                        <FileUp size={13} className="text-(--ws-accent)" />
                        {t('problemImport.openButton')}
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={10}
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); setErrors(p => ({ ...p, description: '' })); }}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all font-mono leading-6 resize-y text-(--ws-text) placeholder-(--ws-faint) ${
                      errors.description ? FIELD_ERR : 'border-(--ws-border) bg-(--ws-panel) focus:border-(--ws-accent) focus:ring-1 focus:ring-(--ws-accent)'
                    }`}
                    placeholder={t('problemForm.descriptionPlaceholder')}
                  />
                  {errors.description && (
                    <p className="mt-1 text-xs text-(--ws-danger) flex items-center gap-1">
                      <AlertCircle size={11} />{errors.description}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ─── TAB: Ngôn ngữ & Phiên bản cho phép ─── */}
            {activeTab === 'languages' && (
              <div className="p-6 space-y-6">
                {/* Header / Guide */}
                <div className="rounded-2xl border border-(--ws-border) bg-(--ws-panel) p-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-(--ws-text) flex items-center gap-2">
                        <FileCode size={18} className="text-(--ws-accent)" />
                        Cấu hình ngôn ngữ & phiên bản trình biên dịch được phép
                      </h3>
                      <p className="mt-1 text-xs text-(--ws-muted) leading-relaxed max-w-2xl">
                        Chỉ định các ngôn ngữ và phiên bản trình biên dịch sinh viên được phép sử dụng để nộp bài.
                        Thích hợp khi lớp học yêu cầu chỉ lập trình bằng C++ hoặc Java và cấm sinh viên nộp bằng Python.
                        Mặc định khi để trống sẽ cho phép <b>tất cả ngôn ngữ</b>.
                      </p>
                    </div>

                    {/* Current status pill */}
                    <div className="shrink-0">
                      {allowedLanguages.length === 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-(--ws-ok-soft) text-(--ws-ok) border border-(--ws-ok)/35">
                          <span className="w-2 h-2 rounded-full bg-(--ws-ok)" aria-hidden="true" />
                          Cho phép tất cả ({SUPPORTED_LANGUAGES.length} phiên bản)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-(--ws-warn-soft) text-(--ws-warn) border border-(--ws-warn)/35">
                          <span className="w-2 h-2 rounded-full bg-(--ws-warn)" />
                          Đang giới hạn: {allowedLanguages.length}/{SUPPORTED_LANGUAGES.length} phiên bản
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Preset buttons */}
                  <div className="mt-4 pt-4 border-t border-(--ws-border) flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-(--ws-muted) mr-1">Chọn nhanh:</span>
                    <button
                      type="button"
                      onClick={() => setAllowedLanguages([])}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        allowedLanguages.length === 0
                          ? 'bg-(--ws-accent) text-(--ws-on-accent) shadow-xs'
                          : 'bg-(--ws-panel) border border-(--ws-border) text-(--ws-muted) hover:bg-(--ws-hover)'
                      }`}
                    >
                      Tất cả ({SUPPORTED_LANGUAGES.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllowedLanguages(SUPPORTED_LANGUAGES.filter(l => l.category === 'CPP').map(l => l.id))}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-(--ws-panel) border border-(--ws-border) text-(--ws-muted) hover:border-(--ws-info)/35 hover:text-(--ws-info) hover:bg-(--ws-info-soft) transition-all"
                    >
                      Chỉ C++ ({SUPPORTED_LANGUAGES.filter(l => l.category === 'CPP').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllowedLanguages(SUPPORTED_LANGUAGES.filter(l => l.category === 'CPP' || l.category === 'C').map(l => l.id))}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-(--ws-panel) border border-(--ws-border) text-(--ws-muted) hover:border-(--ws-info)/35 hover:text-(--ws-info) hover:bg-(--ws-info-soft) transition-all"
                    >
                      C & C++ ({SUPPORTED_LANGUAGES.filter(l => l.category === 'CPP' || l.category === 'C').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllowedLanguages(SUPPORTED_LANGUAGES.filter(l => l.category === 'PYTHON').map(l => l.id))}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-(--ws-panel) border border-(--ws-border) text-(--ws-muted) hover:border-(--ws-ok)/35 hover:text-(--ws-ok) hover:bg-(--ws-ok-soft) transition-all"
                    >
                      Chỉ Python ({SUPPORTED_LANGUAGES.filter(l => l.category === 'PYTHON').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllowedLanguages(SUPPORTED_LANGUAGES.filter(l => l.category === 'JAVA').map(l => l.id))}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-(--ws-panel) border border-(--ws-border) text-(--ws-muted) hover:border-(--ws-warn)/35 hover:text-(--ws-warn) hover:bg-(--ws-warn-soft) transition-all"
                    >
                      Chỉ Java ({SUPPORTED_LANGUAGES.filter(l => l.category === 'JAVA').length})
                    </button>
                    
                    {allowedLanguages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAllowedLanguages([])}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-(--ws-danger-soft) border border-(--ws-danger)/35 text-(--ws-danger) hover:bg-(--ws-danger-soft) transition-all ml-auto"
                      >
                        Khôi phục mở tất cả
                      </button>
                    )}
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-4">
                  {LANGUAGE_CATEGORIES.map((cat) => {
                    const catLanguages = SUPPORTED_LANGUAGES.filter((l) => l.category === cat.key);
                    const isAllDefault = allowedLanguages.length === 0;
                    const selectedInCat = catLanguages.filter((l) => isAllDefault || allowedLanguages.includes(l.id));
                    const allInCatSelected = selectedInCat.length === catLanguages.length;

                    const toggleCat = () => {
                      if (isAllDefault) {
                        // All were enabled by default. Unchecking this category means enabling all other categories!
                        const otherIds = SUPPORTED_LANGUAGES.filter((l) => l.category !== cat.key).map((l) => l.id);
                        setAllowedLanguages(otherIds);
                      } else if (allInCatSelected) {
                        // Uncheck all in this category
                        setAllowedLanguages(allowedLanguages.filter((id) => !catLanguages.some((l) => l.id === id)));
                      } else {
                        // Check all in this category
                        const newIds = new Set([...allowedLanguages, ...catLanguages.map((l) => l.id)]);
                        setAllowedLanguages(Array.from(newIds));
                      }
                    };

                    return (
                      <div key={cat.key} className="rounded-2xl border border-(--ws-border) bg-(--ws-panel) p-5 shadow-xs transition-all hover:border-(--ws-faint)">
                        <div className="flex items-center justify-between pb-3 border-b border-(--ws-border) mb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="inline-flex items-center justify-center min-w-9 h-7 px-1.5 rounded-md bg-(--ws-panel2) border border-(--ws-border) font-mono text-[11px] font-bold">{cat.icon}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-(--ws-text)">{cat.label}</h4>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-(--ws-panel2) text-(--ws-muted) font-medium border border-(--ws-border)">
                                  {selectedInCat.length}/{catLanguages.length} đã chọn
                                </span>
                              </div>
                              <p className="text-[11px] text-(--ws-muted) mt-0.5">{cat.desc}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={toggleCat}
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                              allInCatSelected
                                ? 'bg-(--ws-accent) text-(--ws-on-accent)'
                                : 'bg-(--ws-panel2) text-(--ws-muted) hover:bg-(--ws-hover)'
                            }`}
                          >
                            {allInCatSelected ? 'Bỏ chọn nhóm này' : 'Chọn toàn bộ nhóm'}
                          </button>
                        </div>

                        {/* Version items */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {catLanguages.map((lang) => {
                            const isChecked = allowedLanguages.length === 0 || allowedLanguages.includes(lang.id);

                            const toggleLang = () => {
                              if (allowedLanguages.length === 0) {
                                // Default all -> toggle off this single language
                                const allOthers = SUPPORTED_LANGUAGES.filter((l) => l.id !== lang.id).map((l) => l.id);
                                setAllowedLanguages(allOthers);
                              } else {
                                if (allowedLanguages.includes(lang.id)) {
                                  setAllowedLanguages(allowedLanguages.filter((id) => id !== lang.id));
                                } else {
                                  setAllowedLanguages([...allowedLanguages, lang.id]);
                                }
                              }
                            };

                            return (
                              <div
                                key={lang.id}
                                onClick={toggleLang}
                                className={`flex items-start gap-3 p-3 rounded-xl border text-left cursor-pointer transition-all select-none ${
                                  isChecked
                                    ? 'border-(--ws-accent) bg-(--ws-panel) shadow-xs ring-1 ring-(--ws-accent)/10'
                                    : 'border-(--ws-border) bg-(--ws-panel) opacity-55 hover:opacity-100 hover:border-(--ws-faint)'
                                }`}
                              >
                                <div className="mt-0.5 shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}}
                                    className="w-4 h-4 rounded text-(--ws-accent) accent-(--ws-accent) cursor-pointer"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-(--ws-text)">{lang.name}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium border bg-(--ws-panel2)/60 text-(--ws-muted)">
                                      {lang.compiler}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-(--ws-muted) mt-1 line-clamp-1 leading-snug">
                                    {lang.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB: Test Cases ─── */}
            {activeTab === 'cases' && (
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-semibold text-(--ws-text) flex items-center gap-2">
                      <span>Test Cases</span>
                      {testCases.length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-(--ws-accent)/10 text-(--ws-accent) font-bold font-mono tabular-nums">
                          {t('problemForm.testCasesBadge', { count: testCases.length, pct: Math.round(100 / testCases.length) })}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-(--ws-muted) mt-0.5">
                      {t('problemForm.testCaseHint')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowAiModal(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-(--ws-ok)/35 bg-(--ws-ok-soft) text-(--ws-ok) hover:bg-(--ws-ok-soft) text-xs font-semibold transition-colors shadow-2xs"
                      title={t('problemForm.aiGenerateTooltip')}
                    >
                      <Sparkles size={14} className="text-(--ws-ok)" />
                      {t('problemForm.aiGenerateBtn')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBulkModal(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-(--ws-border) bg-(--ws-panel) text-(--ws-text) hover:text-(--ws-text) hover:bg-(--ws-hover) text-xs font-semibold transition-colors shadow-2xs"
                      title={t('problemForm.bulkImportTooltip')}
                    >
                      <Upload size={14} className="text-(--ws-accent)" />
                      {t('problemForm.bulkImportBtn')}
                    </button>
                    <button
                      type="button"
                      onClick={addTestCase}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-(--ws-accent) text-(--ws-on-accent) text-xs font-semibold hover:bg-(--ws-accent-strong) transition-colors shadow-sm"
                    >
                      <Plus size={14} /> {t('problemForm.addTestCase')}
                    </button>
                  </div>
                </div>

                {/* Batch toolbar if testCases.length > 1 */}
                {testCases.length > 1 && (
                  <div className="flex items-center justify-between px-3.5 py-2 bg-(--ws-panel2)/80 rounded-xl border border-(--ws-border) mb-4 text-xs text-(--ws-text)">
                    <span className="font-medium tabular-nums">
                      {t('problemForm.batchSummary', {
                        total: testCases.length,
                        hidden: testCases.filter(c => c.is_hidden).length,
                        sample: testCases.filter(c => !c.is_hidden).length,
                      })}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => markAllHidden(true)}
                        className="hover:text-(--ws-accent) font-medium transition-colors"
                      >
                        {t('problemForm.hideAllBtn')}
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => markAllHidden(false)}
                        className="hover:text-(--ws-accent) font-medium transition-colors"
                      >
                        {t('problemForm.showAllBtn')}
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={clearAllTestCases}
                        className={`font-medium transition-colors ${
                          confirmClearCases
                            ? 'text-(--ws-danger) font-bold underline'
                            : 'hover:text-(--ws-danger)'
                        }`}
                      >
                        {confirmClearCases ? t('problemForm.confirmClearAllBtn') : t('problemForm.clearAllBtn')}
                      </button>
                    </div>
                  </div>
                )}

                {errors.cases && (
                  <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-(--ws-danger-soft) border border-(--ws-danger)/35 text-(--ws-danger) text-sm">
                    <AlertCircle size={15} /> {errors.cases}
                  </div>
                )}

                {testCases.length === 0 ? (
                  <div
                    className="rounded-2xl border-2 border-dashed border-(--ws-border) p-12 text-center cursor-pointer hover:border-(--ws-accent) hover:bg-(--ws-hover) transition-all group"
                    onClick={addTestCase}
                  >
                    <FlaskConical size={40} className="text-(--ws-faint) mx-auto mb-3 group-hover:text-(--ws-accent) transition-colors" />
                    <p className="font-medium text-(--ws-text) group-hover:text-(--ws-accent)">{t('problemForm.noTestCases')}</p>
                    <p className="text-sm text-(--ws-muted) mt-1">{t('problemForm.firstTestCase')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {testCases.map((tc, index) => (
                      <div
                        key={index}
                        className={`rounded-xl border overflow-hidden ${
                          (errors[`tc_input_${index}`] || errors[`tc_out_${index}`])
                            ? 'border-(--ws-danger)/35'
                            : 'border-(--ws-border)'
                        }`}
                      >
                        {/* Case header */}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-(--ws-panel2) border-b border-(--ws-border)">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-(--ws-text) font-mono">TC #{index + 1}</span>
                            <span className="text-[10px] text-(--ws-muted) bg-(--ws-panel) px-2 py-0.5 rounded border border-(--ws-border) font-mono">
                              ~{Math.round(100 / testCases.length)}% điểm
                            </span>
                            {/* Toggle switch */}
                            <button
                              type="button"
                              onClick={() => updateTestCase(index, 'is_hidden', !tc.is_hidden)}
                              className="flex items-center gap-2"
                            >
                              <div className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${tc.is_hidden ? 'bg-(--ws-accent)' : 'bg-(--ws-faint)'}`}>
                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-(--ws-panel) shadow transition-transform ${tc.is_hidden ? 'translate-x-4' : ''}`} />
                              </div>
                              {tc.is_hidden
                                ? <span className="text-[11px] font-semibold text-(--ws-accent) flex items-center gap-1"><EyeOff size={11} />Hidden</span>
                                : <span className="text-[11px] text-(--ws-muted) flex items-center gap-1"><Eye size={11} />{t('problemForm.sample')}</span>
                              }
                            </button>
                          </div>
                          <button aria-label={t('common.delete')}
                            type="button"
                            onClick={() => removeTestCase(index)}
                            className="p-1.5 rounded-lg text-(--ws-muted) hover:text-(--ws-danger) hover:bg-(--ws-danger-soft) transition-colors"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>

                        {/* Input / Output side by side */}
                        <div className="grid grid-cols-2 divide-x divide-(--ws-border) bg-(--ws-panel)">
                          <div className="p-4">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-(--ws-muted) mb-2">Input</label>
                            <textarea
                              rows={4}
                              value={tc.input}
                              onChange={(e) => {
                                updateTestCase(index, 'input', e.target.value);
                                setErrors(p => ({ ...p, [`tc_input_${index}`]: '' }));
                              }}
                              className={`w-full rounded-lg border px-3 py-2.5 text-sm font-mono text-(--ws-text) placeholder-(--ws-faint) outline-none resize-y transition-all ${
                                errors[`tc_input_${index}`]
                                  ? 'border-(--ws-danger)/35 bg-(--ws-danger-soft)'
                                  : 'border-(--ws-border) bg-(--ws-panel2) focus:border-(--ws-accent) focus:ring-1 focus:ring-(--ws-accent)'
                              }`}
                              placeholder={t('problemForm.inputPlaceholder')}
                            />
                            {errors[`tc_input_${index}`] && (
                              <p className="mt-1 text-[11px] text-(--ws-danger)">{errors[`tc_input_${index}`]}</p>
                            )}
                          </div>
                          <div className="p-4">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-(--ws-muted) mb-2">Expected Output</label>
                            <textarea
                              rows={4}
                              value={tc.expected_output}
                              onChange={(e) => {
                                updateTestCase(index, 'expected_output', e.target.value);
                                setErrors(p => ({ ...p, [`tc_out_${index}`]: '' }));
                              }}
                              className={`w-full rounded-lg border px-3 py-2.5 text-sm font-mono text-(--ws-text) placeholder-(--ws-faint) outline-none resize-y transition-all ${
                                errors[`tc_out_${index}`]
                                  ? 'border-(--ws-danger)/35 bg-(--ws-danger-soft)'
                                  : 'border-(--ws-border) bg-(--ws-panel2) focus:border-(--ws-accent) focus:ring-1 focus:ring-(--ws-accent)'
                              }`}
                              placeholder={t('problemForm.outputPlaceholder')}
                            />
                            {errors[`tc_out_${index}`] && (
                              <p className="mt-1 text-[11px] text-(--ws-danger)">{errors[`tc_out_${index}`]}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Quick add row */}
                    <button
                      type="button"
                      onClick={addTestCase}
                      className="w-full py-3 rounded-xl border-2 border-dashed border-(--ws-border) text-sm text-(--ws-muted) hover:border-(--ws-accent) hover:text-(--ws-accent) hover:bg-(--ws-hover) transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={15} /> Thêm test case
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-(--ws-border) bg-(--ws-panel2) shrink-0 rounded-b-2xl">
            {/* Summary */}
            <div className="flex items-center gap-3 text-xs text-(--ws-muted)">
              <span className="flex items-center gap-1"><Clock size={12} />{timeLimit}ms</span>
              <span className="flex items-center gap-1"><HardDrive size={12} />{memoryLimit}MB</span>
              <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${DIFFICULTY_CONFIG[difficulty].color}`}>
                {t(`problemForm.${difficulty.toLowerCase()}`)}
              </span>
              <span className="text-(--ws-text) font-medium">{testCases.length} test case{testCases.length !== 1 ? 's' : ''}</span>
              {showPoints && (
                <span className="px-2 py-0.5 rounded-md bg-(--ws-accent)/10 text-(--ws-accent) border border-(--ws-accent)/20 text-[11px] font-bold">
                  {t('problemForm.pointsUnit', { count: points })}
                </span>
              )}
            </div>
            {/* Actions */}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-5 py-2 rounded-xl text-sm font-medium text-(--ws-text) border border-(--ws-border) bg-(--ws-panel) hover:bg-(--ws-hover) transition-colors disabled:opacity-50"
              >
                {t('problemForm.cancel')}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-(--ws-accent) text-(--ws-on-accent) text-sm font-semibold hover:bg-(--ws-accent-strong) disabled:opacity-50 transition-colors shadow-sm"
              >
                {isLoading && <Loader2 size={15} className="animate-spin" />}
                {isLoading ? t('problemForm.saving') : (submitText || (isEdit ? t('problemForm.saveChanges') : t('problemForm.create')))}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ─── BULK TESTCASE IMPORT MODAL ─── */}
      {showBulkModal && (
        <div
          className="fixed inset-0 z-250 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setShowBulkModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-(--ws-panel2) border border-(--ws-border) rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-(--ws-border) pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-(--ws-accent)/10 text-(--ws-accent)">
                  <Upload size={18} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-(--ws-text)">{t('problemForm.bulkTitle')}</h3>
                  <p className="text-xs text-(--ws-muted)">{t('problemForm.bulkSubtitle')}</p>
                </div>
              </div>
              <button aria-label={t('common.close')}
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="p-1.5 rounded-lg text-(--ws-muted) hover:text-(--ws-text) hover:bg-(--ws-hover) transition-colors"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Quick action bar */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-(--ws-border) bg-(--ws-panel) text-(--ws-text) hover:text-(--ws-text) hover:bg-(--ws-hover) text-xs font-semibold cursor-pointer transition-colors shadow-2xs">
                  <FileUp size={13} className="text-(--ws-accent)" />
                  {t('problemForm.bulkUploadBtn')}
                  <input type="file" accept=".txt,.json,.csv,.in,.out" onChange={handleUploadTestFile} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={handleInsertBulkSample}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-(--ws-border) bg-(--ws-panel) text-(--ws-text) hover:text-(--ws-text) hover:bg-(--ws-hover) text-xs font-semibold transition-colors shadow-2xs"
                >
                  <Sparkles size={13} className="text-(--ws-accent)" />
                  {t('problemForm.bulkSampleBtn')}
                </button>
              </div>
            </div>

            <div className="bg-(--ws-panel) p-3 rounded-xl border border-(--ws-border) text-xs text-(--ws-text) space-y-1">
              <p className="font-semibold text-(--ws-text)">{t('problemForm.bulkSyntaxTitle')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-(--ws-text)">
                <div className="bg-(--ws-panel2) p-2 rounded-lg">
                  <span className="font-sans font-bold text-(--ws-accent) block mb-1">{t('problemForm.bulkSyntaxCompact')}</span>
                  {`1 2 => 3\n5 10 => 15\n-2 8 => 6`}
                </div>
                <div className="bg-(--ws-panel2) p-2 rounded-lg">
                  <span className="font-sans font-bold text-(--ws-accent) block mb-1">{t('problemForm.bulkSyntaxBlock')}</span>
                  {`=== INPUT ===\n5\n=== OUTPUT ===\n15`}
                </div>
              </div>
            </div>

            <div>
              <textarea
                rows={8}
                value={bulkText}
                onChange={(e) => { setBulkText(e.target.value); setBulkError(''); }}
                placeholder={t('problemForm.bulkPlaceholder')}
                className="w-full rounded-xl border border-(--ws-border) bg-(--ws-panel) p-3 font-mono text-xs text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
              />
              {bulkError && <p className="mt-1.5 text-xs text-(--ws-danger) font-medium whitespace-pre-wrap">{bulkError}</p>}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-(--ws-border)">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 border border-(--ws-border) bg-(--ws-panel) rounded-xl text-xs font-semibold text-(--ws-text) hover:bg-(--ws-hover) transition-colors"
              >
                {t('problemForm.cancel')}
              </button>
              <button
                type="button"
                onClick={handleParseBulk}
                className="px-5 py-2 bg-(--ws-accent) text-(--ws-on-accent) rounded-xl text-xs font-semibold hover:bg-(--ws-accent-strong) transition-colors shadow-sm flex items-center gap-1.5"
              >
                <CheckCheck size={14} /> {t('problemForm.bulkAddBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── AI TESTCASE GENERATOR MODAL ─── */}
      {showAiModal && (
        <div
          className="fixed inset-0 z-260 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => !isAiGenerating && setShowAiModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-(--ws-panel2) border border-(--ws-border) rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-(--ws-border) pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-(--ws-ok-soft) text-(--ws-ok)">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-(--ws-text)">{t('problemForm.aiTitle')}</h3>
                  <p className="text-xs text-(--ws-muted)">{t('problemForm.aiSubtitle')}</p>
                </div>
              </div>
              <button aria-label={t('common.close')}
                type="button"
                onClick={() => setShowAiModal(false)}
                disabled={isAiGenerating}
                className="p-1.5 rounded-lg text-(--ws-muted) hover:text-(--ws-text) hover:bg-(--ws-hover) transition-colors disabled:opacity-50"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Strategy selector */}
            <div>
              <label className="block text-xs font-bold text-(--ws-text) mb-1.5 uppercase tracking-wide">
                {t('problemForm.aiStrategyLabel')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAiStrategy('FROM_DESCRIPTION')}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    aiStrategy === 'FROM_DESCRIPTION'
                      ? 'border-(--ws-accent) bg-(--ws-panel) ring-2 ring-(--ws-accent)/20 text-(--ws-text)'
                      : 'border-(--ws-border) bg-(--ws-panel2) text-(--ws-text) hover:bg-(--ws-panel)'
                  }`}
                >
                  <div className="font-bold mb-0.5">{t('problemForm.aiOptionDescTitle')}</div>
                  <div className="text-[11px] text-(--ws-muted)">{t('problemForm.aiOptionDescSub')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setAiStrategy('FROM_SOLUTION')}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    aiStrategy === 'FROM_SOLUTION'
                      ? 'border-(--ws-accent) bg-(--ws-panel) ring-2 ring-(--ws-accent)/20 text-(--ws-text)'
                      : 'border-(--ws-border) bg-(--ws-panel2) text-(--ws-text) hover:bg-(--ws-panel)'
                  }`}
                >
                  <div className="font-bold mb-0.5">{t('problemForm.aiOptionSolTitle')}</div>
                  <div className="text-[11px] text-(--ws-muted)">{t('problemForm.aiOptionSolSub')}</div>
                </button>
              </div>
            </div>

            {/* If Option 2: Provide solution code */}
            {aiStrategy === 'FROM_SOLUTION' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-(--ws-text)">{t('problemForm.aiSolutionCodeLabel')}</label>
                  <select
                    value={aiSolutionLang}
                    onChange={(e) => setAiSolutionLang(e.target.value)}
                    className="text-xs border border-(--ws-border) bg-(--ws-panel) rounded-lg px-2 py-1 text-(--ws-text) outline-none"
                  >
                    <option value="python">Python 3</option>
                    <option value="cpp">C++ (GCC)</option>
                    <option value="java">Java</option>
                  </select>
                </div>
                <textarea
                  rows={6}
                  value={aiSolutionCode}
                  onChange={(e) => setAiSolutionCode(e.target.value)}
                  placeholder={t('problemForm.aiSolutionPlaceholder')}
                  className="w-full rounded-xl border border-(--ws-border) bg-(--ws-panel) p-3 font-mono text-xs text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
                />
              </div>
            )}

            {/* Test count slider */}
            <div>
              <div className="flex items-center justify-between mb-1 text-xs">
                <span className="font-semibold text-(--ws-text)">{t('problemForm.aiCountLabel')}</span>
                <span className="font-bold font-mono tabular-nums text-(--ws-accent) bg-(--ws-accent)/10 px-2 py-0.5 rounded-full">
                  {t('problemForm.aiCountBadge', { count: aiCount })}
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={10}
                value={aiCount}
                onChange={(e) => setAiCount(Number(e.target.value))}
                className="w-full accent-(--ws-accent) cursor-pointer"
              />
            </div>

            {aiError && (
              <p className="text-xs text-(--ws-danger) font-medium bg-(--ws-danger-soft) p-2.5 rounded-xl border border-(--ws-danger)/35">
                {aiError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-(--ws-border)">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                disabled={isAiGenerating}
                className="px-4 py-2 border border-(--ws-border) bg-(--ws-panel) rounded-xl text-xs font-semibold text-(--ws-text) hover:bg-(--ws-hover) transition-colors disabled:opacity-50"
              >
                {t('problemForm.cancel')}
              </button>
              <button
                type="button"
                onClick={handleGenerateAiTestCases}
                disabled={isAiGenerating || (aiStrategy === 'FROM_SOLUTION' && !aiSolutionCode.trim())}
                className="px-5 py-2 bg-(--ws-ok) text-(--ws-on-accent) rounded-xl text-xs font-semibold hover:bg-(--ws-ok) transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {isAiGenerating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {t('problemForm.aiGenerating')}
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    {t('problemForm.aiStartBtn')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return typeof document !== 'undefined' ? (
    <>
      {createPortal(modal, document.body)}
      <ProblemImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImported={onClose}
        inBank={!(showPoints || privateProblem)}
        onCreatedProblems={onImportedProblems}
      />
    </>
  ) : null;
}
