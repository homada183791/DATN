import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Bot, Check, ChevronDown, FlaskConical, Info, Loader2, RotateCcw, X } from 'lucide-react';
import { ApiError } from '../../api/http';
import {
  exportTestGen,
  isTestGenRunning,
  useApplyTestGen,
  useLatestTestGen,
  useStartTestGen,
  useTestGenJob,
  type DraftSpec,
  type TestGenCandidate,
  type TestGenKind,
  type TestGenStatus,
} from '../../api/testgen';
import { SUPPORTED_LANGUAGES, getLanguageLabel, mapVersionToApi } from '../../config/languages';
import { notifyGlobalToast } from '../../context/ToastContext';
import CodeEditor from '../CodeEditor';

const STEPS: TestGenStatus[] = ['SOLVING', 'GENERATORS', 'INPUTS', 'REFERENCE', 'CHECKING', 'DONE'];
const VERIFY_STYLE: Record<TestGenCandidate['verified_by'], string> = {
  reference: 'text-(--ws-ok)',
  both: 'text-(--ws-ok)',
  fast: 'text-(--ws-warn)',
};
const KIND_STYLE: Record<TestGenKind, string> = {
  random: 'bg-(--ws-info-soft) text-(--ws-info)',
  edge: 'bg-(--ws-warn-soft) text-(--ws-warn)',
  adversarial: 'bg-(--ws-danger-soft) text-(--ws-danger)',
};
const fmtBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`);

/**
 * Sinh test có kiểm chứng (giảng viên):
 * lời giải (của GV, hoặc AI viết 2 lời giải tự chấm chéo) → AI viết chương trình sinh input → chạy trong sandbox
 * → lấy output → chạy lại bài AC cũ.
 * Hai chỗ dùng: bài đã lưu (problemId, thêm thẳng vào bài) và form tạo đề (draft, trả test về form).
 */
export default function TestGenModal({
  problemId,
  problemTitle,
  onClose,
  draft,
}: {
  problemId?: string;
  problemTitle: string;
  onClose: () => void;
  draft?: {
    spec: DraftSpec;
    jobId: string | null;
    onJobId: (id: string) => void;
    onAddTests: (tests: Array<{ input: string; expected_output: string; is_hidden: boolean }>) => void;
  };
}) {
  const { t } = useTranslation();
  const latest = useLatestTestGen(draft ? undefined : problemId);
  const [jobId, setJobIdState] = useState<string | null>(draft?.jobId ?? null);
  const setJobId = (id: string) => {
    setJobIdState(id);
    draft?.onJobId(id);
  };
  const [exporting, setExporting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const job = useTestGenJob(jobId);
  const start = useStartTestGen(draft ? undefined : problemId);
  const apply = useApplyTestGen(jobId);

  const [versionId, setVersionId] = useState('CPP17');
  const [code, setCode] = useState('');
  const [counts, setCounts] = useState({ random: 6, edge: 4, adversarial: 3 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openGen, setOpenGen] = useState<number | null>(null);

  useEffect(() => {
    if (latest.data && !jobId) setJobId(latest.data.id);
  }, [latest.data, jobId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const data = job.data;
  const running = isTestGenRunning(data?.status);
  const formVisible = showForm || (!jobId && (draft ? true : !latest.isLoading && !latest.data));
  const lang = SUPPORTED_LANGUAGES.find((l) => l.id === versionId) ?? SUPPORTED_LANGUAGES[0];

  // Chọn sẵn các test đã kiểm chứng chắc chắn; test chỉ có lời giải nhanh của AI để giảng viên tự quyết
  const candidates = useMemo(() => data?.candidates ?? [], [data]);
  useEffect(() => {
    if (data?.status === 'DONE') setSelected(new Set(candidates.filter((c) => c.verified_by !== 'fast').map((c) => c.id)));
  }, [data?.status, candidates]);

  const runStart = async () => {
    const hasCode = code.trim().length > 0;
    if (hasCode && code.trim().length < 10) return notifyGlobalToast(t('testgen.needCode'));
    try {
      const api = mapVersionToApi(versionId);
      const res = await start.mutateAsync({
        ...(hasCode
          ? { reference_language: api.language, reference_version: api.language_version, reference_code: code }
          : {}),
        random_count: counts.random,
        edge_count: counts.edge,
        adversarial_count: counts.adversarial,
        ...(draft ? draft.spec : {}),
      });
      setJobId(res.id);
      setShowForm(false);
    } catch (err) {
      notifyGlobalToast(err instanceof ApiError ? err.message : t('testgen.startFailed'));
    }
  };

  const runApply = async () => {
    if (draft && jobId) {
      setExporting(true);
      try {
        const tests = await exportTestGen(jobId, [...selected]);
        draft.onAddTests(tests);
        notifyGlobalToast(t('testgen.addedToForm', { n: tests.length }), 'success');
        onClose();
      } catch (err) {
        notifyGlobalToast(err instanceof ApiError ? err.message : t('testgen.applyFailed'));
      } finally {
        setExporting(false);
      }
      return;
    }
    try {
      const res = await apply.mutateAsync([...selected]);
      notifyGlobalToast(t('testgen.applied', { n: res.added, dup: res.skipped_duplicates }), 'success');
    } catch (err) {
      notifyGlobalToast(err instanceof ApiError ? err.message : t('testgen.applyFailed'));
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const s = data?.summary ?? {};
  const stepIndex = data ? STEPS.indexOf(data.status) : -1;
  const [openSol, setOpenSol] = useState<'fast' | 'brute' | null>(null);

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-300 flex items-center justify-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="testgen-title"
        className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-6 py-4 border-b border-(--ws-border)">
          <FlaskConical size={22} className="text-(--ws-accent) mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <h3 id="testgen-title" className="text-lg font-bold">{t('testgen.title')}</h3>
            <p className="text-sm text-(--ws-muted) truncate">{problemTitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="p-2 rounded-lg text-(--ws-muted) hover:bg-(--ws-hover)">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <ol className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {(['step1', 'step2', 'step3', 'step4'] as const).map((k, i) => (
              <li key={k} className="rounded-lg border border-(--ws-border-soft) bg-(--ws-panel2) px-3 py-2">
                <span className="font-bold text-(--ws-accent)">{i + 1}.</span> {t(`testgen.${k}`)}
              </li>
            ))}
          </ol>

          {formVisible ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-4">
                <label className="text-sm">
                  <span className="block font-semibold mb-1">{t('testgen.refLanguage')}</span>
                  <select
                    value={versionId}
                    onChange={(e) => setVersionId(e.target.value)}
                    className="min-h-10 rounded-lg border border-(--ws-border) bg-(--ws-panel2) px-3"
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.id} value={l.id}>{getLanguageLabel(l)}</option>
                    ))}
                  </select>
                </label>
                {(['random', 'edge', 'adversarial'] as const).map((k) => (
                  <label key={k} className="text-sm">
                    <span className="block font-semibold mb-1">{t(`testgen.kind.${k}`)}</span>
                    <input
                      type="number"
                      min={0}
                      max={k === 'adversarial' ? 10 : 15}
                      value={counts[k]}
                      onChange={(e) => setCounts((c) => ({ ...c, [k]: Math.max(0, Math.min(15, Number(e.target.value) || 0)) }))}
                      className="w-24 min-h-10 rounded-lg border border-(--ws-border) bg-(--ws-panel2) px-3"
                    />
                  </label>
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">
                  {t('testgen.refCode')} <span className="font-normal text-(--ws-muted)">{t('testgen.optional')}</span>
                </p>
                <p className="text-xs text-(--ws-muted) mb-2">{t('testgen.refHint')}</p>
                {!code.trim() && (
                  <p className="flex gap-2 text-xs rounded-lg bg-(--ws-info-soft) text-(--ws-text) px-3 py-2 mb-2">
                    <Bot size={14} className="text-(--ws-info) shrink-0 mt-0.5" aria-hidden="true" />
                    {t('testgen.aiModeHint')}
                  </p>
                )}
                <div className="h-72 rounded-lg overflow-hidden border border-(--ws-border)">
                  <CodeEditor
                    value={code}
                    onChange={setCode}
                    language={lang.monacoLang}
                    fontSize={13}
                    wordWrap={false}
                    diagnostics={[]}
                    ariaLabel={t('testgen.refCode')}
                  />
                </div>
              </div>
            </div>
          ) : data ? (
            <div className="space-y-5">
              {running && (
                <div className="flex items-center gap-3 rounded-xl border border-(--ws-border) bg-(--ws-panel2) px-4 py-3">
                  <Loader2 size={18} className="animate-spin text-(--ws-accent)" aria-hidden="true" />
                  <div className="text-sm">
                    <p className="font-semibold">{t(`testgen.status.${data.status}`)}</p>
                    <p className="text-(--ws-muted) text-xs">{t('testgen.runningHint')}</p>
                  </div>
                  <div className="ml-auto flex gap-1" aria-hidden="true">
                    {STEPS.slice(0, 5).map((st, i) => (
                      <span key={st} className={`h-1.5 w-8 rounded-full ${i <= stepIndex ? 'bg-(--ws-accent)' : 'bg-(--ws-border)'}`} />
                    ))}
                  </div>
                </div>
              )}

              {data.status === 'FAILED' && (
                <div role="alert" className="rounded-xl border border-(--ws-danger) bg-(--ws-danger-soft) px-4 py-3 text-sm">
                  <p className="font-semibold text-(--ws-danger)">{t('testgen.failed')}</p>
                  <pre className="mt-1 whitespace-pre-wrap font-mono text-xs">{data.error}</pre>
                </div>
              )}

              {data.status === 'DONE' && (
                <>
                  {s.draft ? (
                    <div className="flex gap-3 rounded-xl border border-(--ws-border) bg-(--ws-info-soft) px-4 py-3 text-sm">
                      <Info size={20} className="text-(--ws-info) shrink-0" aria-hidden="true" />
                      <p>{t('testgen.draftNote')}</p>
                    </div>
                  ) : (s.accepted_broken ?? 0) > 0 ? (
                    <div role="alert" className="flex gap-3 rounded-xl border border-(--ws-warn) bg-(--ws-warn-soft) px-4 py-3">
                      <AlertTriangle size={20} className="text-(--ws-warn) shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="text-sm">
                        <p className="font-bold">{t('testgen.weakTitle', { n: s.accepted_broken, total: s.accepted_checked })}</p>
                        <p className="text-(--ws-muted)">{t('testgen.weakBody')}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 rounded-xl border border-(--ws-border) bg-(--ws-ok-soft) px-4 py-3 text-sm">
                      <Check size={20} className="text-(--ws-ok) shrink-0" aria-hidden="true" />
                      <p>{(s.accepted_checked ?? 0) > 0 ? t('testgen.strong', { total: s.accepted_checked }) : t('testgen.noAccepted')}</p>
                    </div>
                  )}
                  <p className="text-sm text-(--ws-muted)">
                    {t('testgen.stats', { gen: s.generated ?? 0, kept: s.kept ?? 0, dropped: s.dropped ?? 0, existing: s.existing_tests ?? 0 })}
                    {data.mode === 'AI' && ` ${t('testgen.statsAi', { agree: s.agree ?? 0, mismatch: s.mismatch ?? 0, unverified: s.unverified ?? 0 })}`}
                  </p>
                </>
              )}

              {data.solutions && (
                <section>
                  <h4 className="text-sm font-bold mb-1">{t('testgen.aiSolutions')}</h4>
                  <p className="text-xs text-(--ws-muted) mb-2">
                    {t('testgen.aiSolutionsNote', {
                      n: data.solutions.samples_checked,
                      k: data.solutions.attempts,
                      src: t(`testgen.src.${data.solutions.samples_source}`),
                    })}
                  </p>
                  <ul className="space-y-1.5">
                    {(['fast', 'brute'] as const).map((k) => (
                      <li key={k} className="rounded-lg border border-(--ws-border-soft)">
                        <button
                          type="button"
                          onClick={() => setOpenSol(openSol === k ? null : k)}
                          aria-expanded={openSol === k}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm"
                        >
                          <Bot size={15} className="text-(--ws-accent)" aria-hidden="true" />
                          <span className="font-semibold">{t(`testgen.sol.${k}`)}</span>
                          <span className="text-xs text-(--ws-muted)">{data.solutions![k].language === 'CPP' ? 'C++' : 'Python'}</span>
                          <ChevronDown size={16} className={`ml-auto transition-transform ${openSol === k ? 'rotate-180' : ''}`} aria-hidden="true" />
                        </button>
                        {openSol === k && (
                          <pre className="mx-3 mb-3 max-h-60 overflow-auto rounded-md bg-(--ws-panel2) p-3 text-xs font-mono">{data.solutions![k].code}</pre>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {data.generators?.length > 0 && (
                <section>
                  <h4 className="text-sm font-bold mb-2">{t('testgen.generators')}</h4>
                  <ul className="space-y-1.5">
                    {data.generators.map((g, i) => (
                      <li key={i} className="rounded-lg border border-(--ws-border-soft)">
                        <button
                          type="button"
                          onClick={() => setOpenGen(openGen === i ? null : i)}
                          aria-expanded={openGen === i}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm"
                        >
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${KIND_STYLE[g.kind]}`}>{t(`testgen.kind.${g.kind}`)}</span>
                          <span className="font-mono font-semibold">{g.name}</span>
                          <span className="text-(--ws-muted) truncate flex-1">{g.description}</span>
                          {g.error ? (
                            <span className="text-xs text-(--ws-danger)">{t('testgen.genError')}</span>
                          ) : (
                            <span className="text-xs text-(--ws-muted)">{t('testgen.produced', { n: g.produced ?? 0 })}</span>
                          )}
                          <ChevronDown size={16} className={`transition-transform ${openGen === i ? 'rotate-180' : ''}`} aria-hidden="true" />
                        </button>
                        {openGen === i && (
                          <div className="px-3 pb-3 space-y-2">
                            {g.error && <pre className="text-xs text-(--ws-danger) whitespace-pre-wrap font-mono">{g.error}</pre>}
                            <pre className="max-h-60 overflow-auto rounded-md bg-(--ws-panel2) p-3 text-xs font-mono">{g.code}</pre>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {data.status === 'DONE' && candidates.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-sm font-bold">{t('testgen.candidates')}</h4>
                    <button
                      type="button"
                      className="text-xs text-(--ws-accent) font-semibold"
                      onClick={() => setSelected(selected.size === candidates.length ? new Set() : new Set(candidates.map((c) => c.id)))}
                    >
                      {selected.size === candidates.length ? t('testgen.selectNone') : t('testgen.selectAll')}
                    </button>
                    {!s.draft && (
                      <button
                        type="button"
                        className="text-xs text-(--ws-accent) font-semibold"
                        onClick={() => setSelected(new Set(candidates.filter((c) => c.breaks.length).map((c) => c.id)))}
                      >
                        {t('testgen.selectBreaking')}
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-(--ws-border)">
                    <table className="w-full text-xs">
                      <thead className="bg-(--ws-panel2) text-(--ws-muted)">
                        <tr>
                          <th className="w-8 px-2 py-2" />
                          <th className="px-2 py-2 text-left">{t('testgen.col.kind')}</th>
                          <th className="px-2 py-2 text-left">{t('testgen.col.input')}</th>
                          <th className="px-2 py-2 text-left">{t('testgen.col.output')}</th>
                          <th className="px-2 py-2 text-left">{t('testgen.col.verified')}</th>
                          <th className="px-2 py-2 text-right">{t('testgen.col.time')}</th>
                          {!s.draft && <th className="px-2 py-2 text-left">{t('testgen.col.breaks')}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.map((c) => (
                          <tr key={c.id} className="border-t border-(--ws-border-soft) align-top">
                            <td className="px-2 py-2">
                              <input
                                type="checkbox"
                                checked={selected.has(c.id)}
                                onChange={() => toggle(c.id)}
                                aria-label={t('testgen.selectOne', { id: c.id })}
                              />
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded font-bold ${KIND_STYLE[c.kind]}`}>{t(`testgen.kind.${c.kind}`)}</span>
                              <div className="mt-1 font-mono text-(--ws-faint)">{c.generator}</div>
                            </td>
                            <td className="px-2 py-2 max-w-xs">
                              <pre className="max-h-20 overflow-hidden whitespace-pre-wrap break-all font-mono">{c.input}</pre>
                              <span className="text-(--ws-faint)">{fmtBytes(c.input_bytes)}</span>
                            </td>
                            <td className="px-2 py-2 max-w-[12rem]">
                              <pre className="max-h-20 overflow-hidden whitespace-pre-wrap break-all font-mono">{c.expected_output}</pre>
                            </td>
                            <td className={`px-2 py-2 whitespace-nowrap font-semibold ${VERIFY_STYLE[c.verified_by] ?? ''}`} title={t(`testgen.verify.${c.verified_by}Hint`)}>
                              {t(`testgen.verify.${c.verified_by}`)}
                            </td>
                            <td className={`px-2 py-2 text-right whitespace-nowrap ${c.heavy ? 'text-(--ws-warn) font-semibold' : ''}`}>
                              {c.reference_time_ms} ms{c.heavy ? ` · ${t('testgen.heavy')}` : ''}
                            </td>
                            {!s.draft && <td className="px-2 py-2">
                              {c.breaks.length ? (
                                <span className="font-semibold text-(--ws-danger)">
                                  {t('testgen.breaksN', { n: c.breaks.length })}
                                  <span className="block font-normal text-(--ws-muted)">
                                    {[...new Set(c.breaks.map((b) => b.verdict))].join(', ')}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-(--ws-faint)">—</span>
                              )}
                            </td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="flex justify-center py-10">
              <Loader2 size={22} className="animate-spin text-(--ws-muted)" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-t border-(--ws-border)">
          {formVisible ? (
            <>
              {jobId && (
                <button type="button" onClick={() => setShowForm(false)} className="min-h-10 px-4 rounded-lg border border-(--ws-border) text-sm font-semibold">
                  {t('testgen.backToResult')}
                </button>
              )}
              <button
                type="button"
                onClick={runStart}
                disabled={start.isPending}
                className="ml-auto inline-flex items-center gap-2 min-h-10 px-5 rounded-lg bg-(--ws-accent) text-(--ws-on-accent) text-sm font-semibold disabled:opacity-60"
              >
                {start.isPending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <FlaskConical size={16} aria-hidden="true" />}
                {t('testgen.start')}
              </button>
            </>
          ) : (
            <>
              {!running && (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 min-h-10 px-4 rounded-lg border border-(--ws-border) text-sm font-semibold"
                >
                  <RotateCcw size={16} aria-hidden="true" /> {t('testgen.again')}
                </button>
              )}
              {data?.status === 'DONE' && (
                <button
                  type="button"
                  onClick={runApply}
                  disabled={apply.isPending || exporting || selected.size === 0}
                  className="ml-auto inline-flex items-center gap-2 min-h-10 px-5 rounded-lg bg-(--ws-accent) text-(--ws-on-accent) text-sm font-semibold disabled:opacity-60"
                >
                  {apply.isPending || exporting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
                  {draft ? t('testgen.addToForm', { n: selected.size }) : t('testgen.apply', { n: selected.size })}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
