import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, Sparkles, X } from 'lucide-react';
import { ApiError } from '../../api/http';
import {
  useProblemSkillsQuery,
  useSetProblemSkills,
  useSkillCatalogQuery,
  useSuggestProblemSkills,
} from '../../api/skills';
import { notifyGlobalToast } from '../../context/ToastContext';
import { CATEGORY_ORDER } from './skillUi';

/**
 * Giảng viên gắn nhãn kỹ năng cho một bài: AI đề xuất (chờ duyệt) → chọn/bỏ trong danh mục → Lưu.
 * Chỉ nhãn đã lưu (đã duyệt) mới được dùng để tính điểm kỹ năng của sinh viên.
 */
export default function SkillTagModal({
  problemId,
  problemTitle,
  onClose,
}: {
  problemId: string;
  problemTitle: string;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const en = i18n.language?.startsWith('en');
  const { data: catalog = [], isLoading: loadingCatalog } = useSkillCatalogQuery();
  const { data: current = [], isLoading: loadingCurrent } = useProblemSkillsQuery(problemId);
  const suggest = useSuggestProblemSkills(problemId);
  const save = useSetProblemSkills(problemId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [touched, setTouched] = useState(false);
  const [query, setQuery] = useState('');

  // Khi có dữ liệu (hoặc AI vừa đề xuất) và người dùng chưa tự chỉnh: chọn sẵn mọi nhãn hiện có
  useEffect(() => {
    if (!touched) setSelected(new Set(current.map((s) => s.code)));
  }, [current, touched]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const byCode = useMemo(() => new Map(current.map((s) => [s.code, s])), [current]);
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = catalog.filter(
      (s) => !q || `${s.code} ${s.name_vi} ${s.name_en}`.toLowerCase().includes(q),
    );
    return CATEGORY_ORDER.map((cat) => ({ cat, items: list.filter((s) => s.category === cat) })).filter((g) => g.items.length);
  }, [catalog, query]);

  const toggle = (code: string) => {
    setTouched(true);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else if (next.size < 10) next.add(code);
      return next;
    });
  };

  const runSuggest = async () => {
    try {
      const res = await suggest.mutateAsync();
      setTouched(false);
      notifyGlobalToast(
        res.mode === 'ai' ? t('skills.tag.suggestedAi', { n: res.skills.filter((s) => !s.approved).length }) : t('skills.tag.suggestedKeywords'),
        res.mode === 'ai' ? 'success' : 'info',
      );
    } catch (err) {
      notifyGlobalToast(err instanceof ApiError ? err.message : t('skills.tag.suggestFailed'));
    }
  };

  const runSave = async () => {
    try {
      await save.mutateAsync([...selected]);
      notifyGlobalToast(t('skills.tag.saved'), 'success');
      onClose();
    } catch (err) {
      notifyGlobalToast(err instanceof ApiError ? err.message : t('skills.tag.saveFailed'));
    }
  };

  const pending = current.filter((s) => !s.approved);
  const name = (s: { name_vi: string; name_en: string }) => (en ? s.name_en : s.name_vi);

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-90 flex items-center justify-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="skilltag-title"
        className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-6 py-4 border-b border-(--ws-border)">
          <div className="flex-1 min-w-0">
            <h3 id="skilltag-title" className="text-lg font-bold">{t('skills.tag.title')}</h3>
            <p className="text-sm text-(--ws-muted) truncate">{problemTitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="p-2 rounded-lg text-(--ws-muted) hover:bg-(--ws-hover)">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-(--ws-border-soft) space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runSuggest}
              disabled={suggest.isPending}
              className="inline-flex items-center gap-2 min-h-10 px-4 rounded-lg bg-(--ws-accent) text-(--ws-on-accent) text-sm font-semibold disabled:opacity-60"
            >
              {suggest.isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
              {suggest.isPending ? t('skills.tag.suggesting') : t('skills.tag.suggestBtn')}
            </button>
            <p className="text-xs text-(--ws-muted) flex-1 min-w-[220px]">{t('skills.tag.suggestHint')}</p>
          </div>
          {pending.length > 0 && (
            <ul className="rounded-lg border border-(--ws-info)/30 bg-(--ws-info-soft) p-3 space-y-1.5">
              <li className="text-xs font-semibold text-(--ws-info)">{t('skills.tag.pendingTitle')}</li>
              {pending.map((s) => (
                <li key={s.code} className="text-[13px]">
                  <span className="font-semibold">{name(s)}</span>
                  {s.reason && <span className="text-(--ws-muted)"> — {s.reason}</span>}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-1.5 min-h-8" aria-live="polite">
            <span className="text-xs font-semibold text-(--ws-muted) mr-1">{t('skills.tag.selected', { n: selected.size })}</span>
            {[...selected].map((code) => {
              const s = catalog.find((c) => c.code === code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggle(code)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-(--ws-accent) text-(--ws-on-accent) text-xs font-semibold"
                  aria-label={t('skills.tag.remove', { name: s ? name(s) : code })}
                >
                  {s ? name(s) : code}
                  <X size={11} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <label className="block mb-3">
            <span className="sr-only">{t('skills.tag.search')}</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('skills.tag.search')}
              className="w-full min-h-10 px-3 rounded-lg bg-(--ws-panel2) border border-(--ws-border) text-sm outline-none focus:border-(--ws-accent)"
            />
          </label>
          {loadingCatalog || loadingCurrent ? (
            <div className="py-10 flex justify-center text-(--ws-muted)"><Loader2 className="animate-spin" aria-hidden="true" /></div>
          ) : (
            grouped.map((g) => (
              <section key={g.cat} className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-(--ws-muted) mb-2">{t(`skills.category.${g.cat}`)}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {g.items.map((s) => {
                    const on = selected.has(s.code);
                    const ai = byCode.get(s.code);
                    return (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => toggle(s.code)}
                        aria-pressed={on}
                        title={s.description ?? undefined}
                        className={`inline-flex items-center gap-1 min-h-8 px-2.5 rounded-lg border text-[12.5px] transition-colors ${
                          on
                            ? 'bg-(--ws-accent)/12 border-(--ws-accent) text-(--ws-accent) font-semibold'
                            : 'border-(--ws-border) hover:bg-(--ws-hover)'
                        }`}
                      >
                        {on && <Check size={12} aria-hidden="true" />}
                        {name(s)}
                        {ai && !ai.approved && <Sparkles size={11} className="text-(--ws-info)" aria-label={t('skills.tag.aiMark')} />}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-(--ws-border)">
          <p className="text-xs text-(--ws-muted)">{t('skills.tag.saveHint')}</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="min-h-10 px-4 rounded-lg border border-(--ws-border) text-sm font-semibold hover:bg-(--ws-hover)">
              {t('skills.tag.cancel')}
            </button>
            <button
              type="button"
              onClick={runSave}
              disabled={save.isPending}
              className="inline-flex items-center gap-2 min-h-10 px-5 rounded-lg bg-(--ws-accent) text-(--ws-on-accent) text-sm font-semibold disabled:opacity-60"
            >
              {save.isPending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
              {t('skills.tag.save')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
