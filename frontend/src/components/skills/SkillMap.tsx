import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Brain, ChevronDown, Info, Loader2 } from 'lucide-react';
import { useMySkillsQuery, useSkillRecommendationsQuery } from '../../api/skills';
import { CATEGORY_ORDER, LEVEL_TONE, masteryColor, pct } from './skillUi';

/**
 * Bản đồ kỹ năng của sinh viên: điểm nắm vững 0–1 (BKT) từng kỹ năng, chọn xem chung hoặc theo lớp,
 * kèm gợi ý bài nên làm tiếp nhắm vào kỹ năng còn yếu.
 */
export default function SkillMap() {
  const { t, i18n } = useTranslation();
  const en = i18n.language?.startsWith('en');
  const [scope, setScope] = useState('global');
  const [showUntried, setShowUntried] = useState(false);
  const { data, isLoading } = useMySkillsQuery(scope);
  const { data: recs = [] } = useSkillRecommendationsQuery();

  const tried = useMemo(() => (data?.skills ?? []).filter((s) => s.attempts > 0), [data]);
  const untried = useMemo(() => (data?.skills ?? []).filter((s) => s.attempts === 0), [data]);
  const groups = useMemo(
    () =>
      CATEGORY_ORDER.map((cat) => ({
        cat,
        items: tried.filter((s) => s.category === cat).sort((a, b) => (a.p_mastery ?? 0) - (b.p_mastery ?? 0)),
      })).filter((g) => g.items.length),
    [tried],
  );
  const name = (s: { name_vi: string; name_en: string }) => (en ? s.name_en : s.name_vi);
  const summary = useMemo(() => {
    const leveled = tried.filter((s) => s.level !== 'insufficient');
    return {
      mastered: leveled.filter((s) => s.level === 'mastered' || s.level === 'proficient').length,
      weak: leveled.filter((s) => s.level === 'not_yet').length,
      learning: leveled.filter((s) => s.level === 'learning').length,
    };
  }, [tried]);

  return (
    <section aria-labelledby="skillmap-title" className="bg-(--ws-panel) border border-(--ws-border) rounded-xl shadow-sm">
      <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-(--ws-border-soft)">
        <h3 id="skillmap-title" className="text-lg font-bold text-(--ws-text) flex items-center gap-2 flex-1 min-w-[200px]">
          <Brain size={20} className="text-(--ws-accent)" aria-hidden="true" /> {t('skills.map.title')}
        </h3>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-(--ws-muted)">{t('skills.map.scope')}</span>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="min-h-9 px-2.5 rounded-lg bg-(--ws-panel2) border border-(--ws-border) text-sm"
          >
            <option value="global">{t('skills.map.scopeGlobal')}</option>
            {(data?.classes ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.subject ? `${c.subject} - ${c.name}` : c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center text-(--ws-muted)"><Loader2 className="animate-spin" aria-hidden="true" /></div>
      ) : tried.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="font-semibold text-(--ws-text)">{t('skills.map.emptyTitle')}</p>
          <p className="text-sm text-(--ws-muted) mt-1">{scope === 'global' ? t('skills.map.emptyDesc') : t('skills.map.emptyClassDesc')}</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_320px]">
          <div className="px-6 py-5 space-y-5">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className={`px-2.5 py-1 rounded-full border font-semibold ${LEVEL_TONE.proficient}`}>{t('skills.map.sumGood', { n: summary.mastered })}</span>
              <span className={`px-2.5 py-1 rounded-full border font-semibold ${LEVEL_TONE.learning}`}>{t('skills.map.sumLearning', { n: summary.learning })}</span>
              <span className={`px-2.5 py-1 rounded-full border font-semibold ${LEVEL_TONE.not_yet}`}>{t('skills.map.sumWeak', { n: summary.weak })}</span>
            </div>
            {groups.map((g) => (
              <div key={g.cat}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-(--ws-muted) mb-2">{t(`skills.category.${g.cat}`)}</h4>
                <ul className="space-y-2">
                  {g.items.map((s) => (
                    <li key={s.code} className="grid grid-cols-[minmax(130px,200px)_1fr_auto] items-center gap-3">
                      <span className="text-sm font-medium text-(--ws-text) truncate" title={name(s)}>{name(s)}</span>
                      <div
                        className="h-2.5 rounded-full bg-(--ws-border-soft) overflow-hidden"
                        role="meter"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round((s.p_mastery ?? 0) * 100)}
                        aria-label={name(s)}
                      >
                        <div className="h-full rounded-full" style={{ width: pct(s.p_mastery), background: masteryColor(s.p_mastery ?? 0) }} />
                      </div>
                      <span className="flex items-center gap-2 justify-end min-w-[150px]">
                        <span className="font-mono text-xs text-(--ws-muted)" title={t('skills.map.attemptsTitle')}>
                          {s.correct}/{s.attempts}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${LEVEL_TONE[s.level]}`}>
                          {s.level === 'insufficient' ? t('skills.level.insufficient') : `${pct(s.p_mastery)} · ${t(`skills.level.${s.level}`)}`}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {untried.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowUntried((v) => !v)}
                  aria-expanded={showUntried}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-(--ws-accent) hover:underline"
                >
                  <ChevronDown size={14} className={showUntried ? 'rotate-180' : ''} aria-hidden="true" />
                  {t('skills.map.untried', { n: untried.length })}
                </button>
                {showUntried && (
                  <p className="mt-2 text-xs text-(--ws-muted) leading-6">{untried.map((s) => name(s)).join(' · ')}</p>
                )}
              </div>
            )}
            <p className="flex gap-1.5 text-[11.5px] text-(--ws-faint)">
              <Info size={13} className="shrink-0 mt-0.5" aria-hidden="true" />
              {t('skills.map.howItWorks')}
            </p>
          </div>

          <aside className="border-t lg:border-t-0 lg:border-l border-(--ws-border-soft) px-5 py-5" aria-labelledby="skillrec-title">
            <h4 id="skillrec-title" className="text-sm font-bold text-(--ws-text) mb-3">{t('skills.rec.title')}</h4>
            {recs.length === 0 ? (
              <p className="text-xs text-(--ws-muted)">{t('skills.rec.empty')}</p>
            ) : (
              <ul className="space-y-2">
                {recs.map((r) => (
                  <li key={r.problem_id}>
                    <Link
                      to={`/student/problem/${r.problem_id}`}
                      className="group block rounded-lg border border-(--ws-border) px-3 py-2.5 hover:border-(--ws-accent) hover:bg-(--ws-hover)"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-(--ws-text) truncate">{r.title}</span>
                        <ArrowRight size={14} className="shrink-0 text-(--ws-faint) group-hover:text-(--ws-accent)" aria-hidden="true" />
                      </div>
                      <div className="text-[11.5px] text-(--ws-muted) mt-0.5">
                        {r.reason === 'weak' ? t('skills.rec.weak') : t('skills.rec.new')}: {en ? r.skill_name_en : r.skill_name_vi}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
