import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, Brain, Info, Loader2, RefreshCw } from 'lucide-react';
import { ApiError } from '../../api/http';
import {
  fetchSkillEvaluation,
  recomputeSkills,
  useClassSkillHeatmapQuery,
  type SkillEvaluationDto,
} from '../../api/skills';
import { notifyGlobalToast } from '../../context/ToastContext';
import { masteryBg, masteryColor, pct } from './skillUi';

/**
 * Tab "Kỹ năng" trong trang lớp của giảng viên: bảng nhiệt sinh viên × kỹ năng (điểm BKT trong lớp),
 * điểm lớp thang 10 theo trọng số, trung bình lớp từng kỹ năng, và đánh giá mô hình (AUC/F1/Accuracy).
 */
export default function ClassSkillHeatmap({ classId }: { classId: string }) {
  const { t, i18n } = useTranslation();
  const en = i18n.language?.startsWith('en');
  const qc = useQueryClient();
  const { data, isLoading, error } = useClassSkillHeatmapQuery(classId);
  const [evaluation, setEvaluation] = useState<SkillEvaluationDto | null>(null);
  const [busy, setBusy] = useState<'eval' | 'recompute' | null>(null);

  const run = async (kind: 'eval' | 'recompute') => {
    setBusy(kind);
    try {
      const res = kind === 'eval' ? await fetchSkillEvaluation() : await recomputeSkills();
      setEvaluation(res);
      if (kind === 'recompute') {
        await qc.invalidateQueries({ queryKey: ['skills'] });
        notifyGlobalToast(t('skills.class.recomputed', { n: res.evaluated }), 'success');
      }
    } catch (err) {
      notifyGlobalToast(err instanceof ApiError ? err.message : t('skills.class.actionFailed'));
    } finally {
      setBusy(null);
    }
  };

  if (isLoading)
    return <div className="py-16 flex justify-center text-(--ws-muted)"><Loader2 className="animate-spin" aria-hidden="true" /></div>;
  if (error || !data)
    return <p className="py-10 text-center text-sm text-(--ws-muted)">{error instanceof ApiError ? error.message : t('skills.class.loadFailed')}</p>;

  const name = (s: { name_vi: string; name_en: string }) => (en ? s.name_en : s.name_vi);
  const fmt = (x: number | null, digits = 2) => (x == null ? '—' : x.toFixed(digits));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-[260px]">
          <h3 className="text-lg font-bold text-(--ws-text) flex items-center gap-2">
            <Brain size={20} className="text-(--ws-accent)" aria-hidden="true" /> {t('skills.class.title')}
          </h3>
          <p className="text-sm text-(--ws-muted)">{t('skills.class.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => run('eval')}
          disabled={!!busy}
          className="inline-flex items-center gap-2 min-h-10 px-4 rounded-lg border border-(--ws-border) text-sm font-semibold hover:bg-(--ws-hover) disabled:opacity-60"
        >
          {busy === 'eval' ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Activity size={15} aria-hidden="true" />}
          {t('skills.class.evalBtn')}
        </button>
        <button
          type="button"
          onClick={() => run('recompute')}
          disabled={!!busy}
          className="inline-flex items-center gap-2 min-h-10 px-4 rounded-lg bg-(--ws-accent) text-(--ws-on-accent) text-sm font-semibold disabled:opacity-60"
        >
          {busy === 'recompute' ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={15} aria-hidden="true" />}
          {t('skills.class.recomputeBtn')}
        </button>
      </div>

      {data.untagged_problems > 0 && (
        <p className="flex gap-2 rounded-lg border border-(--ws-warn)/30 bg-(--ws-warn-soft) px-4 py-2.5 text-sm text-(--ws-text)">
          <Info size={16} className="shrink-0 mt-0.5 text-(--ws-warn)" aria-hidden="true" />
          {t('skills.class.untagged', { n: data.untagged_problems, total: data.problems })}
        </p>
      )}

      {evaluation && (
        <div className="rounded-xl border border-(--ws-border) bg-(--ws-panel) p-4">
          <h4 className="text-sm font-bold text-(--ws-text) mb-3">{t('skills.eval.title')}</h4>
          <dl className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
            {[
              ['AUC', fmt(evaluation.auc)],
              ['Accuracy', fmt(evaluation.accuracy)],
              ['F1', fmt(evaluation.f1)],
              [t('skills.eval.majority'), fmt(evaluation.majority_accuracy)],
              [t('skills.eval.samples'), `${evaluation.evaluated} / ${evaluation.students} SV`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-(--ws-panel2) px-3 py-2">
                <dt className="text-[11px] font-semibold text-(--ws-muted)">{k}</dt>
                <dd className="font-mono text-base font-bold text-(--ws-text)">{v}</dd>
              </div>
            ))}
          </dl>
          {evaluation.learning_curve.length > 1 && (
            <div className="mt-3">
              <p className="text-[11.5px] font-semibold text-(--ws-muted) mb-1.5">{t('skills.eval.curve')}</p>
              <div className="flex items-end gap-1.5 h-16" role="img" aria-label={t('skills.eval.curve')}>
                {evaluation.learning_curve.map((c) => (
                  <div key={c.attempt} className="flex flex-col items-center gap-1 flex-1 min-w-6" title={`${t('skills.eval.attempt')} ${c.attempt}: ${Math.round(c.error_rate * 100)}% (${c.n})`}>
                    <div className="w-full rounded-t bg-(--ws-danger)/70" style={{ height: `${Math.max(4, c.error_rate * 56)}px` }} />
                    <span className="text-[10px] font-mono text-(--ws-faint)">{c.attempt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="mt-3 text-[11.5px] text-(--ws-faint)">{t('skills.eval.note')}</p>
        </div>
      )}

      {data.skills.length === 0 ? (
        <div className="rounded-xl border border-(--ws-border) bg-(--ws-panel2) p-10 text-center text-sm text-(--ws-muted)">
          {t('skills.class.noSkills')}
        </div>
      ) : data.students.length === 0 ? (
        <div className="rounded-xl border border-(--ws-border) bg-(--ws-panel2) p-10 text-center text-sm text-(--ws-muted)">
          {t('skills.class.noStudents')}
        </div>
      ) : (
        <div className="rounded-xl border border-(--ws-border) bg-(--ws-panel) overflow-x-auto">
          <table className="border-collapse text-sm min-w-full">
            <thead>
              <tr className="text-left text-xs text-(--ws-muted)">
                <th scope="col" className="sticky left-0 z-10 bg-(--ws-panel) px-4 py-3 font-semibold min-w-[200px]">{t('skills.class.student')}</th>
                <th scope="col" className="px-3 py-3 font-semibold text-right whitespace-nowrap">{t('skills.class.score10')}</th>
                {data.skills.map((s) => (
                  <th key={s.code} scope="col" className="px-2 py-3 font-semibold align-bottom min-w-[88px]">
                    <span className="block leading-tight" title={`${name(s)} — ${t('skills.class.weight')}: ${s.weight}`}>{name(s)}</span>
                    <span className="block font-mono text-[10px] text-(--ws-faint) mt-0.5">w={s.weight}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-(--ws-border) bg-(--ws-panel2)">
                <th scope="row" className="sticky left-0 z-10 bg-(--ws-panel2) px-4 py-2 text-left text-xs font-semibold text-(--ws-muted)">{t('skills.class.classAvg')}</th>
                <td />
                {data.skills.map((s) => (
                  <td key={s.code} className="px-2 py-2 text-center font-mono text-xs font-semibold" style={{ color: s.class_avg != null ? masteryColor(s.class_avg) : undefined }}>
                    {pct(s.class_avg)}
                  </td>
                ))}
              </tr>
              {data.students.map((st) => (
                <tr key={st.id} className="border-t border-(--ws-border-soft)">
                  <th scope="row" className="sticky left-0 z-10 bg-(--ws-panel) px-4 py-2 text-left font-medium">
                    <span className="block truncate max-w-[220px]">{st.full_name || st.username}</span>
                    <span className="block text-[11px] text-(--ws-muted) font-mono">{st.student_code ?? `@${st.username}`}</span>
                  </th>
                  <td className="px-3 py-2 text-right font-mono font-bold whitespace-nowrap">{st.score10 != null ? st.score10.toFixed(1) : '—'}</td>
                  {data.skills.map((s) => {
                    const c = st.cells[s.code];
                    return (
                      <td key={s.code} className="px-1 py-1">
                        <div
                          className="rounded-md px-1.5 py-1.5 text-center font-mono text-xs"
                          style={{ background: masteryBg(c.p, c.from === 'class' ? 32 : 14) }}
                          title={`${name(s)}: ${pct(c.p)} — ${t(`skills.class.from_${c.from}`)}${c.attempts ? `, ${c.attempts} ${t('skills.class.attempts')}` : ''}`}
                        >
                          <span className={c.from === 'class' ? 'font-semibold text-(--ws-text)' : 'text-(--ws-muted)'}>{pct(c.p)}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="flex gap-1.5 text-[11.5px] text-(--ws-faint)">
        <Info size={13} className="shrink-0 mt-0.5" aria-hidden="true" />
        {t('skills.class.legend')}
      </p>
    </div>
  );
}
