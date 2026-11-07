import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X, FileUp, FileText, Trash2, Loader2, CheckCircle2, AlertCircle, UploadCloud } from 'lucide-react';
import { createProblem, CreateProblemDto, ProblemDifficulty } from '../api/problems';

interface ProblemImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Gọi khi đóng cửa sổ sau khi đã tạo được ít nhất 1 bài */
  onImported?: () => void;
}

interface ImportFile {
  id: string;
  name: string;
  size: number;
  problems: CreateProblemDto[];
  error?: string;
}

interface ImportFailure {
  title: string;
  reason: string;
}

const CONCURRENCY = 4;

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

/** Đọc 1 tệp (.json: 1 bài hoặc danh sách bài; .md/.txt: 1 bài, lấy tên từ tiêu đề đầu tiên). */
async function parseFile(file: File): Promise<ImportFile> {
  const base = { id: `${file.name}-${file.size}-${file.lastModified}`, name: file.name, size: file.size };
  try {
    const text = (await file.text()).replace(/^﻿/, '');
    const trimmed = text.trim();
    const looksJson = file.name.toLowerCase().endsWith('.json') || /^[[{]/.test(trimmed);
    if (looksJson) {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const problems = list.map(toProblemDto).filter((p): p is CreateProblemDto => p !== null);
      if (problems.length === 0) return { ...base, problems: [], error: 'empty' };
      return { ...base, problems };
    }
    // Markdown / văn bản thuần: 1 bài, chưa có test case
    const heading = trimmed.match(/^#{1,3}\s+(.+)$/m);
    const title = (heading ? heading[1] : file.name.replace(/\.[^.]+$/, '')).trim();
    if (!trimmed) return { ...base, problems: [], error: 'empty' };
    return {
      ...base,
      problems: [{ title, description: trimmed, difficulty: 'EASY', time_limit: 1000, memory_limit: 256, test_cases: [] }],
    };
  } catch {
    return { ...base, problems: [], error: 'parse' };
  }
}

const formatSize = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default function ProblemImportModal({ isOpen, onClose, onImported }: ProblemImportModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);
  const [files, setFiles] = useState<ImportFile[]>([]);
  const [reading, setReading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [created, setCreated] = useState(0);
  const [failures, setFailures] = useState<ImportFailure[]>([]);
  const [finished, setFinished] = useState(false);

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
    if (importedAny) void queryClient.invalidateQueries({ queryKey: ['problems'] });
    reset();
    onClose();
    if (importedAny) onImported?.();
  };

  const handleComplete = async () => {
    const queue = files.flatMap((f) => f.problems);
    if (queue.length === 0 || running) return;
    cancelRef.current = false;
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
          await createProblem(p);
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
    void queryClient.invalidateQueries({ queryKey: ['problems'] });
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
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate" title={f.name}>
                            {f.name}
                          </p>
                          <p className={`text-xs ${f.error ? 'text-red-600' : 'text-[#8a8073]'}`}>
                            {f.error
                              ? t(f.error === 'empty' ? 'problemImport.errorEmpty' : 'problemImport.errorParse')
                              : `${t('problemImport.problemCount', { count: f.problems.length })} · ${formatSize(f.size)}`}
                          </p>
                        </div>
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

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}
