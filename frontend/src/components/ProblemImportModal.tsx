import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X, FileUp, FileText, Trash2, Pencil, Loader2, CheckCircle2, AlertCircle, UploadCloud, ChevronDown, Download } from 'lucide-react';
import { createProblem, CreateProblemDto, ProblemDifficulty, type ProblemDto } from '../api/problems';

interface ProblemImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Gọi khi đóng cửa sổ sau khi đã tạo được ít nhất 1 bài */
  onImported?: () => void;
  /** false = bài tạo ra chỉ thuộc lớp/bài tập, không đưa vào Ngân hàng bài tập (mặc định true) */
  inBank?: boolean;
  /** Trả về các bài đã tạo (kèm dữ liệu gốc) khi đóng cửa sổ — dùng để gắn thẳng vào bài tập */
  onCreatedProblems?: (items: Array<{ created: ProblemDto; dto: CreateProblemDto }>) => void;
}

interface ImportFile {
  id: string;
  name: string;
  size: number;
  /** Nội dung gốc của tệp (có thể sửa trực tiếp trong màn hình xem) */
  text: string;
  problems: CreateProblemDto[];
  error?: string;
}

interface ImportFailure {
  title: string;
  reason: string;
}

const CONCURRENCY = 4;

/** Tệp mẫu cho người dùng tải về / xem cấu trúc (1 tệp .json có thể chứa 1 bài hoặc một mảng nhiều bài). */
const SAMPLE_PROBLEMS = [
  {
    title: 'Tổng hai số',
    description:
      '[Tiếng Việt]\nCho hai số nguyên a và b. Hãy in ra tổng a + b.\n\nVí dụ:\nĐầu vào: 2 3\nĐầu ra: 5\n\nRàng buộc:\n-10^9 <= a, b <= 10^9\n\n----------\n\n[English]\nGiven two integers a and b, print a + b.\n\nExample:\nInput: 2 3\nOutput: 5\n\nConstraints:\n-10^9 <= a, b <= 10^9',
    difficulty: 'EASY',
    time_limit: 1000,
    memory_limit: 256,
    test_cases: [
      { input: '2 3', expected_output: '5', is_hidden: false },
      { input: '-5 5', expected_output: '0', is_hidden: false },
      { input: '1000000000 1000000000', expected_output: '2000000000', is_hidden: true },
    ],
  },
];
const SAMPLE_JSON = JSON.stringify(SAMPLE_PROBLEMS, null, 2);

const downloadSample = () => {
  const blob = new Blob([SAMPLE_JSON], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mau_bai_tap.json';
  a.click();
  URL.revokeObjectURL(url);
};

const SAMPLE_MD = `# Tổng hai số

[Tiếng Việt]
Cho hai số nguyên a và b. Hãy in ra tổng a + b.

**Ví dụ:**
\`\`\`
Đầu vào: 2 3
Đầu ra: 5
\`\`\`

**Ràng buộc:** -10^9 <= a, b <= 10^9

----------

[English]
Given two integers a and b, print a + b.

**Example:**
\`\`\`
Input: 2 3
Output: 5
\`\`\`

**Constraints:** -10^9 <= a, b <= 10^9
`;

const downloadSampleMd = () => {
  const blob = new Blob([SAMPLE_MD], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mau_bai_tap.md';
  a.click();
  URL.revokeObjectURL(url);
};

const GUIDE_FIELDS: Array<{ name: string; required: boolean; key: string }> = [
  { name: 'title', required: true, key: 'guideFieldTitle' },
  { name: 'description', required: true, key: 'guideFieldDescription' },
  { name: 'difficulty', required: false, key: 'guideFieldDifficulty' },
  { name: 'time_limit', required: false, key: 'guideFieldTimeLimit' },
  { name: 'memory_limit', required: false, key: 'guideFieldMemoryLimit' },
  { name: 'test_cases', required: false, key: 'guideFieldTestCases' },
];

const toText = (v: unknown): string => (typeof v === 'string' ? v : JSON.stringify(v));

/** Chuyển 1 object JSON bất kỳ (định dạng Hard_450.json hoặc bài đơn) thành dữ liệu tạo bài. */
function toProblemDto(raw: any): CreateProblemDto | null {
  if (!raw || typeof raw !== 'object') return null;
  const title = String(raw.title ?? '').trim();
  let description = '';
  if (raw.description) description = String(raw.description);
  else if (raw.description_vi && raw.description_en) {
    description = `[Tiếng Việt]\n${raw.description_vi}\n\n----------\n\n[English]\n${raw.description_en}`;
  } else if (raw.description_vi) description = String(raw.description_vi);
  else if (raw.description_en) description = String(raw.description_en);
  description = description.trim();
  if (!title || !description) return null;

  const d = String(raw.difficulty ?? 'EASY').toUpperCase();
  const difficulty: ProblemDifficulty = d === 'HARD' || d === 'MEDIUM' || d === 'EASY' ? d : 'EASY';

  const cases = Array.isArray(raw.test_cases) ? raw.test_cases : [];
  return {
    title,
    description,
    difficulty,
    time_limit: Math.round(Number(raw.time_limit)) || 1000,
    memory_limit: Math.round(Number(raw.memory_limit)) || 256,
    test_cases: cases
      .filter((tc: any) => tc && tc.input != null && tc.expected_output != null)
      .map((tc: any, idx: number) => ({
        input: toText(tc.input),
        expected_output: toText(tc.expected_output),
        is_hidden: typeof tc.is_hidden === 'boolean' ? tc.is_hidden : idx >= 2,
      })),
  };
}

/** Phân tích nội dung tệp (.json: 1 bài hoặc danh sách bài; .md/.txt: 1 bài, lấy tên từ tiêu đề đầu tiên). */
function parseText(name: string, rawText: string): { problems: CreateProblemDto[]; error?: string } {
  try {
    const trimmed = rawText.replace(/^\uFEFF/, '').trim();
    const looksJson = name.toLowerCase().endsWith('.json') || /^[[{]/.test(trimmed);
    if (looksJson) {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const problems = list.map(toProblemDto).filter((p): p is CreateProblemDto => p !== null);
      if (problems.length === 0) return { problems: [], error: 'empty' };
      return { problems };
    }
    // Markdown / văn bản thuần: 1 bài, chưa có test case
    const heading = trimmed.match(/^#{1,3}\s+(.+)$/m);
    const title = (heading ? heading[1] : name.replace(/\.[^.]+$/, '')).trim();
    if (!trimmed) return { problems: [], error: 'empty' };
    return {
      problems: [{ title, description: trimmed, difficulty: 'EASY', time_limit: 1000, memory_limit: 256, test_cases: [] }],
    };
  } catch {
    return { problems: [], error: 'parse' };
  }
}

/** Đọc 1 tệp tải lên. */
async function parseFile(file: File): Promise<ImportFile> {
  const base = { id: `${file.name}-${file.size}-${file.lastModified}`, name: file.name, size: file.size };
  try {
    const text = await file.text();
    return { ...base, text, ...parseText(file.name, text) };
  } catch {
    return { ...base, text: '', problems: [], error: 'parse' };
  }
}

const formatSize = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default function ProblemImportModal({ isOpen, onClose, onImported, inBank = true, onCreatedProblems }: ProblemImportModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);
  const createdListRef = useRef<Array<{ created: ProblemDto; dto: CreateProblemDto }>>([]);
  const [files, setFiles] = useState<ImportFile[]>([]);
  const [reading, setReading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [created, setCreated] = useState(0);
  const [failures, setFailures] = useState<ImportFailure[]>([]);
  const [finished, setFinished] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [guideTab, setGuideTab] = useState<'json' | 'md'>('json');

  const total = files.reduce((s, f) => s + f.problems.length, 0);

  const addFiles = useCallback(async (list: FileList | File[]) => {
    const picked = Array.from(list);
    if (picked.length === 0) return;
    setReading(true);
    const parsed = await Promise.all(picked.map(parseFile));
    setFiles((prev) => {
      const ids = new Set(prev.map((f) => f.id));
      return [...prev, ...parsed.filter((f) => !ids.has(f.id))];
    });
    setReading(false);
  }, []);

  const reset = () => {
    setFiles([]);
    setDone(0);
    setCreated(0);
    setFailures([]);
    setFinished(false);
    setRunning(false);
    cancelRef.current = false;
  };

  const handleClose = () => {
    if (running) return;
    const importedAny = created > 0;
    if (importedAny && inBank) void queryClient.invalidateQueries({ queryKey: ['problems'] });
    const list = createdListRef.current;
    createdListRef.current = [];
    reset();
    onClose();
    if (list.length > 0) onCreatedProblems?.(list);
    if (importedAny) onImported?.();
  };

  const handleComplete = async () => {
    const queue = files.flatMap((f) => f.problems);
    if (queue.length === 0 || running) return;
    cancelRef.current = false;
    createdListRef.current = [];
    setRunning(true);
    setFinished(false);
    setDone(0);
    setCreated(0);
    setFailures([]);

    let next = 0;
    let ok = 0;
    let processed = 0;
    const failed: ImportFailure[] = [];
    const worker = async () => {
      while (!cancelRef.current) {
        const i = next++;
        if (i >= queue.length) return;
        const p = queue[i];
        try {
          const res = await createProblem(inBank ? p : { ...p, in_bank: false });
          createdListRef.current.push({ created: res, dto: p });
          ok++;
        } catch (e: any) {
          failed.push({ title: p.title, reason: e?.message || 'Error' });
        }
        processed++;
        setDone(processed);
        setCreated(ok);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
    setFailures(failed);
    setRunning(false);
    setFinished(true);
    if (inBank) void queryClient.invalidateQueries({ queryKey: ['problems'] });
  };

  const editingFile = files.find((f) => f.id === editingId) || null;
  const draftParsed = editingFile ? parseText(editingFile.name, draft) : null;

  const openEditor = (f: ImportFile) => {
    if (running) return;
    setDraft(f.text);
    setEditingId(f.id);
  };

  const saveEditor = () => {
    if (!editingFile) return;
    const parsed = parseText(editingFile.name, draft);
    const size = new Blob([draft]).size;
    setFiles((prev) => prev.map((x) => (x.id === editingFile.id ? { ...x, text: draft, size, ...parsed, error: parsed.error } : x)));
    setEditingId(null);
  };

  if (!isOpen) return null;

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const modal = (
    <div
      className="fixed inset-0 z-300 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#f7f4eb] border border-[#e5dac9] rounded-2xl shadow-2xl overflow-hidden text-[#191919]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5dac9]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#e5dac9]/60 flex items-center justify-center">
              <FileUp size={18} className="text-[#193a2b]" />
            </div>
            <div>
              <h3 className="font-bold font-serif text-base">{t('problemImport.title')}</h3>
              <p className="text-xs text-[#8a8073]">{t('problemImport.subtitle')}</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} disabled={running} className="text-[#8a8073] hover:text-[#191919] disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!finished && (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (!running) void addFiles(e.dataTransfer.files);
                }}
                className={`rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                  dragOver ? 'border-[#193a2b] bg-[#193a2b]/5' : 'border-[#d9cdb8] bg-white/60'
                }`}
              >
                <UploadCloud size={28} className="mx-auto text-[#193a2b] mb-2" />
                <p className="text-sm font-semibold">{t('problemImport.dropHint')}</p>
                <p className="text-xs text-[#8a8073] mt-1">{t('problemImport.formats')}</p>
                <button
                  type="button"
                  disabled={running}
                  onClick={() => inputRef.current?.click()}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[#193a2b] text-white text-xs font-semibold rounded-xl hover:bg-[#122b1f] disabled:opacity-50"
                >
                  <FileUp size={14} /> {t('problemImport.chooseFiles')}
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".json,.md,.markdown"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) void addFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </div>

              {/* Chú thích cấu trúc tệp tải lên */}
              <div className="rounded-xl border border-[#e5dac9] bg-white/70">
                <button
                  type="button"
                  onClick={() => setShowGuide((v) => !v)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-[#5c5446]">{t('problemImport.guideTitle')}</span>
                  <ChevronDown size={16} className={`text-[#8a8073] transition-transform ${showGuide ? 'rotate-180' : ''}`} />
                </button>
                {showGuide && (
                  <div className="px-4 pb-4 space-y-3 text-xs text-[#5c5446]">
                    <div className="inline-flex rounded-lg border border-[#cbbd9f] overflow-hidden">
                      {(['json', 'md'] as const).map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setGuideTab(k)}
                          className={`px-3 py-1.5 text-[11px] font-semibold ${guideTab === k ? 'bg-[#193a2b] text-white' : 'bg-white text-[#5c5446] hover:bg-[#f0ebd9]'}`}
                        >
                          {k === 'json' ? '.json' : '.md'}
                        </button>
                      ))}
                    </div>
                    {guideTab === 'json' ? (
                      <div className="space-y-3">
                      <p className="leading-relaxed">{t('problemImport.guideIntro')}</p>

                      <div className="overflow-x-auto rounded-lg border border-[#e5dac9]">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-[#f0ebd9]/70 text-[11px] uppercase tracking-wider text-[#8a8073]">
                              <th className="px-3 py-2">{t('problemImport.guideColField')}</th>
                              <th className="px-3 py-2">{t('problemImport.guideColRequired')}</th>
                              <th className="px-3 py-2">{t('problemImport.guideColMeaning')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e5dac9]/70">
                            {GUIDE_FIELDS.map((f) => (
                              <tr key={f.name} className="align-top">
                                <td className="px-3 py-2 font-mono font-semibold text-[#193a2b]">{f.name}</td>
                                <td className="px-3 py-2">{f.required ? t('problemImport.guideYes') : t('problemImport.guideNo')}</td>
                                <td className="px-3 py-2 leading-relaxed">{t(`problemImport.${f.key}`)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <ul className="list-disc pl-4 space-y-1 leading-relaxed">
                        <li>{t('problemImport.guideNoteArray')}</li>
                        <li>{t('problemImport.guideNoteBilingual')}</li>
                        <li>{t('problemImport.guideNoteIgnored')}</li>
                      </ul>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="font-semibold text-[#191919]">{t('problemImport.guideExample')}</p>
                          <button
                            type="button"
                            onClick={downloadSample}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f0ebd9] border border-[#cbbd9f] text-[#191919] text-[11px] font-semibold rounded-lg hover:bg-[#e5dac9]"
                          >
                            <Download size={12} /> {t('problemImport.guideDownloadSample')}
                          </button>
                        </div>
                        <pre className="max-h-56 overflow-auto rounded-lg bg-[#191919] text-[#e8e2d4] p-3 text-[11px] leading-relaxed font-mono whitespace-pre">{SAMPLE_JSON}</pre>
                      </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                      <p className="leading-relaxed">{t('problemImport.guideMdIntro')}</p>
                      <div className="overflow-x-auto rounded-lg border border-[#e5dac9]">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-[#f0ebd9]/70 text-[11px] uppercase tracking-wider text-[#8a8073]">
                              <th className="px-3 py-2">{t('problemImport.guideMdColPart')}</th>
                              <th className="px-3 py-2">{t('problemImport.guideColMeaning')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e5dac9]/70">
                            {['Title', 'Body', 'Defaults'].map((k) => (
                              <tr key={k} className="align-top">
                                <td className="px-3 py-2 font-semibold text-[#193a2b]">{t(`problemImport.guideMd${k}Name`)}</td>
                                <td className="px-3 py-2 leading-relaxed">{t(`problemImport.guideMd${k}`)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <ul className="list-disc pl-4 space-y-1 leading-relaxed">
                        <li>{t('problemImport.guideMdNoteOne')}</li>
                        <li>{t('problemImport.guideNoteBilingual')}</li>
                        <li>{t('problemImport.guideMdNoteTests')}</li>
                      </ul>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="font-semibold text-[#191919]">{t('problemImport.guideMdExample')}</p>
                          <button
                            type="button"
                            onClick={downloadSampleMd}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f0ebd9] border border-[#cbbd9f] text-[#191919] text-[11px] font-semibold rounded-lg hover:bg-[#e5dac9]"
                          >
                            <Download size={12} /> {t('problemImport.guideDownloadSample')}
                          </button>
                        </div>
                        <pre className="max-h-56 overflow-auto rounded-lg bg-[#191919] text-[#e8e2d4] p-3 text-[11px] leading-relaxed font-mono whitespace-pre">{SAMPLE_MD}</pre>
                      </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {reading && (
                <p className="flex items-center gap-2 text-xs text-[#8a8073]">
                  <Loader2 size={14} className="animate-spin" /> {t('problemImport.reading')}
                </p>
              )}

              {files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#5c5446]">
                    {t('problemImport.fileList', { count: files.length })}
                  </p>
                  <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {files.map((f) => (
                      <li
                        key={f.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-white ${
                          f.error ? 'border-red-300' : 'border-[#e5dac9]'
                        }`}
                      >
                        <FileText size={16} className={f.error ? 'text-red-500' : 'text-[#193a2b]'} />
                        <button
                          type="button"
                          onClick={() => openEditor(f)}
                          disabled={running}
                          title={t('problemImport.viewEdit')}
                          className="min-w-0 flex-1 text-left cursor-pointer disabled:cursor-default"
                        >
                          <p className="text-sm font-semibold truncate" title={f.name}>
                            {f.name}
                          </p>
                          <p className={`text-xs ${f.error ? 'text-red-600' : 'text-[#8a8073]'}`}>
                            {f.error
                              ? t(f.error === 'empty' ? 'problemImport.errorEmpty' : 'problemImport.errorParse')
                              : `${t('problemImport.problemCount', { count: f.problems.length })} · ${formatSize(f.size)}`}
                          </p>
                        </button>
                        <button
                          type="button"
                          disabled={running}
                          onClick={() => openEditor(f)}
                          className="text-[#8a8073] hover:text-[#193a2b] disabled:opacity-40"
                          title={t('problemImport.viewEdit')}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          disabled={running}
                          onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
                          className="text-[#8a8073] hover:text-red-600 disabled:opacity-40"
                          title={t('problemImport.remove')}
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {running && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#5c5446]">
                    <span>{t('problemImport.importing', { done, total })}</span>
                    <span className="font-semibold">{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#e5dac9] rounded-full overflow-hidden">
                    <div className="h-full bg-[#193a2b] rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}
            </>
          )}

          {finished && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
                <p className="text-sm font-semibold text-emerald-800">{t('problemImport.resultOk', { count: created })}</p>
              </div>
              {failures.length > 0 && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-2">
                  <p className="flex items-center gap-2 text-sm font-semibold text-red-700">
                    <AlertCircle size={16} /> {t('problemImport.resultFail', { count: failures.length })}
                  </p>
                  <ul className="text-xs text-red-700 space-y-1 max-h-40 overflow-y-auto">
                    {failures.slice(0, 50).map((f, i) => (
                      <li key={i}>
                        <span className="font-semibold">{f.title}</span>: {f.reason}
                      </li>
                    ))}
                    {failures.length > 50 && <li>… {t('problemImport.more', { count: failures.length - 50 })}</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[#e5dac9] bg-[#eee8d8]/60">
          <span className="text-xs text-[#8a8073]">
            {!finished && total > 0 ? t('problemImport.summary', { problems: total, files: files.length }) : ''}
          </span>
          <div className="flex items-center gap-3">
            {running ? (
              <button
                type="button"
                onClick={() => {
                  cancelRef.current = true;
                }}
                className="px-5 py-2 bg-white border border-[#e5dac9] text-xs font-semibold rounded-xl hover:bg-[#f0ebd9]"
              >
                {t('problemImport.stop')}
              </button>
            ) : finished ? (
              <button type="button" onClick={handleClose} className="px-6 py-2 bg-[#193a2b] text-white text-xs font-bold rounded-xl hover:bg-[#122b1f]">
                {t('problemImport.close')}
              </button>
            ) : (
              <>
                <button type="button" onClick={handleClose} className="px-5 py-2 bg-white border border-[#e5dac9] text-xs font-semibold rounded-xl hover:bg-[#f0ebd9]">
                  {t('problemImport.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleComplete()}
                  disabled={total === 0 || reading}
                  className="px-6 py-2 bg-[#193a2b] text-white text-xs font-bold rounded-xl hover:bg-[#122b1f] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t('problemImport.complete')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const editor = editingFile && draftParsed && (
    <div
      className="fixed inset-0 z-310 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4"
      onClick={(e) => e.target === e.currentTarget && setEditingId(null)}
    >
      <div className="w-full max-w-4xl h-[85vh] flex flex-col bg-[#f7f4eb] border border-[#e5dac9] rounded-2xl shadow-2xl overflow-hidden text-[#191919]">
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-[#e5dac9]">
          <div className="min-w-0">
            <h3 className="font-bold font-serif text-base truncate" title={editingFile.name}>{editingFile.name}</h3>
            <p className={`text-xs ${draftParsed.error ? 'text-red-600' : 'text-[#8a8073]'}`}>
              {draftParsed.error
                ? t(draftParsed.error === 'empty' ? 'problemImport.errorEmpty' : 'problemImport.errorParse')
                : `${t('problemImport.problemCount', { count: draftParsed.problems.length })} · ${formatSize(new Blob([draft]).size)}`}
            </p>
          </div>
          <button type="button" onClick={() => setEditingId(null)} className="text-[#8a8073] hover:text-[#191919]">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 min-h-0 p-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            wrap="off"
            className="w-full h-full resize-none rounded-xl border border-[#d9cdb8] bg-white p-3 font-mono text-xs leading-relaxed text-[#191919] outline-none focus:border-[#193a2b] whitespace-pre overflow-auto"
          />
        </div>
        <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-[#e5dac9]">
          <p className="text-xs text-[#8a8073]">{t('problemImport.editHint')}</p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#cbbd9f] bg-[#f0ebd9] text-[#191919] hover:bg-[#e5dac9]"
            >
              {t('problemImport.editCancel')}
            </button>
            <button
              type="button"
              onClick={saveEditor}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#193a2b] text-white hover:bg-[#122b1f]"
            >
              {t('problemImport.editSave')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(
        <>
          {modal}
          {editor}
        </>,
        document.body,
      )
    : null;
}