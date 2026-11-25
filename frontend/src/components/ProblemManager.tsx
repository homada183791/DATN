import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { HomeworkProblem } from '../context/HomeworkContext';
import { useProblemsQuery, createProblem, fetchProblem, type CreateProblemDto, type ProblemDto } from '../api/problems';
import ProblemFormModal from './ProblemFormModal';
import {
  Plus,
  Trash2,
  FileText,
  Check,
  ListChecks,
  Link2,
  Search,
  X,
  Loader2,
  Clock,
  HardDrive,
  Lightbulb,
} from 'lucide-react';

interface Props {
  problems: HomeworkProblem[];
  onChange: (problems: HomeworkProblem[]) => void;
}

const diffChip: Record<string, string> = {
  Easy: 'bg-(--ws-ok-soft) text-(--ws-ok) border-(--ws-ok)/35',
  Medium: 'bg-(--ws-warn-soft) text-(--ws-warn) border-(--ws-warn)/35',
  Hard: 'bg-(--ws-danger-soft) text-(--ws-danger) border-(--ws-danger)/35',
};
const diffLabel: Record<string, string> = { Easy: 'easy', Medium: 'medium', Hard: 'hard' };

// Map difficulty từ Problem Bank (EASY/MEDIUM/HARD) → HomeworkProblem (Easy/Medium/Hard)
const diffMap: Record<string, HomeworkProblem['difficulty']> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
};

type ModalType = 'link' | 'compose' | null;

export default function ProblemManager({ problems, onChange }: Props) {
  const { t } = useTranslation();
  const [modalType, setModalType] = useState<ModalType>(null);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkErr, setLinkErr] = useState('');
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [composeSaving, setComposeSaving] = useState(false);

  // Fetch Problem Bank để cho phép link bài
  const { data: bankProblems = [] } = useProblemsQuery();

  const totalPoints = problems.reduce((s, p) => s + (p.points || 0), 0);

  // ── Link từ ngân hàng ────────────────────────────────────────────────────
  const linkFromBank = async (bankId: string) => {
    const bank = bankProblems.find((p) => p.id === bankId);
    if (!bank || linkingId) return;
    if (problems.some((p) => p.problem_id === bankId)) {
      setLinkErr(t('problemManager.duplicate'));
      return;
    }
    setLinkingId(bankId);
    setLinkErr('');
    try {
      // Gọi fetchProblem để lấy đầy đủ description và test_cases
      const full = await fetchProblem(bankId);
      const sampleTc = full.test_cases?.find((tc) => !tc.is_hidden) || full.test_cases?.[0];
      const task: HomeworkProblem = {
        id: `LINKED-${bankId}`,
        problem_id: bankId,
        title: full.title || bank.title,
        statement: full.description || bank.description || '',
        difficulty: diffMap[full.difficulty] ?? diffMap[bank.difficulty] ?? 'Easy',
        points: 100,
        sampleInput: sampleTc?.input ?? '',
        sampleOutput: sampleTc?.expected_output ?? '',
      };
      onChange([...problems, task]);
    } catch {
      // Fallback an toàn nếu có lỗi kết nối
      const task: HomeworkProblem = {
        id: `LINKED-${bankId}`,
        problem_id: bankId,
        title: bank.title,
        statement: bank.description || '',
        difficulty: diffMap[bank.difficulty] ?? 'Easy',
        points: 100,
        sampleInput: '',
        sampleOutput: '',
      };
      onChange([...problems, task]);
    } finally {
      setLinkingId(null);
    }
  };

  // ── Soạn bài mới → tạo Problem riêng cho lớp (không vào ngân hàng) rồi gắn vào bài tập ─────────────────
  const handleComposeSubmit = async (data: CreateProblemDto, points = 100) => {
    setComposeSaving(true);
    try {
      // in_bank:false → bài chỉ thuộc lớp/bài tập, không hiện trong Ngân hàng bài tập
      const created = await createProblem({ ...data, in_bank: false });

      const sampleTc = data.test_cases?.find((tc) => !tc.is_hidden) || data.test_cases?.[0];
      const task: HomeworkProblem = {
        id: `LINKED-${created.id}`,
        problem_id: created.id,
        title: created.title,
        statement: created.description || '',
        difficulty: diffMap[created.difficulty] ?? 'Easy',
        points: points,
        sampleInput: sampleTc?.input ?? '',
        sampleOutput: sampleTc?.expected_output ?? '',
      };
      onChange([...problems, task]);
      setModalType(null);
    } catch (err: any) {
      alert(err?.message || t('problemManager.createFailed'));
    } finally {
      setComposeSaving(false);
    }
  };

  // ── Tải tệp ngay trong bài tập → tạo bài riêng cho lớp (không vào ngân hàng) rồi gắn vào bài tập ──
  const handleImportedProblems = (items: Array<{ created: ProblemDto; dto: CreateProblemDto }>) => {
    const existing = new Set(problems.map((p) => p.problem_id));
    const tasks: HomeworkProblem[] = items
      .filter(({ created }) => !existing.has(created.id))
      .map(({ created, dto }) => {
        const sampleTc = dto.test_cases?.find((tc) => !tc.is_hidden) || dto.test_cases?.[0];
        return {
          id: `LINKED-${created.id}`,
          problem_id: created.id,
          title: created.title,
          statement: created.description || '',
          difficulty: diffMap[created.difficulty] ?? 'Easy',
          points: 100,
          sampleInput: sampleTc?.input ?? '',
          sampleOutput: sampleTc?.expected_output ?? '',
        };
      });
    if (tasks.length > 0) onChange([...problems, ...tasks]);
    setModalType(null);
  };

  const remove = (id: string) => onChange(problems.filter((p) => p.id !== id));

  const updatePoints = (id: string, newPoints: number) => {
    onChange(problems.map((p) => (p.id === id ? { ...p, points: Math.max(0, newPoints) } : p)));
  };

  const bankFiltered = bankProblems.filter(
    (bp) =>
      !linkSearch.trim() ||
      bp.title.toLowerCase().includes(linkSearch.toLowerCase()) ||
      bp.id.toLowerCase().includes(linkSearch.toLowerCase())
  );

  const hasDocument = typeof document !== 'undefined';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-(--ws-text) flex items-center gap-1.5">
          <ListChecks size={15} /> {t('problemManager.problemsTitle')}
          <span className="text-xs text-(--ws-muted) font-normal">{t('problemManager.problemCount', { count: problems.length, points: totalPoints })}</span>
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => { setLinkSearch(''); setLinkErr(''); setModalType('link'); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-(--ws-info) text-(--ws-on-accent) rounded-lg hover:bg-(--ws-info) transition-colors shadow-sm"
          >
            <Link2 size={13} /> {t('problemManager.fromBank')}
          </button>
          <button
            type="button"
            onClick={() => setModalType('compose')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-(--ws-accent) text-(--ws-on-accent) rounded-lg hover:bg-(--ws-accent-strong) transition-colors shadow-sm"
          >
            <Plus size={13} /> {t('problemManager.createNew')}
          </button>
        </div>
      </div>

      {/* Task list */}
      <div className="border border-(--ws-border) rounded-xl overflow-hidden divide-y divide-(--ws-border)/60 bg-(--ws-panel)">
        {problems.length === 0 ? (
          <div className="p-6 text-center">
            <FileText size={30} className="text-(--ws-faint) mx-auto mb-2" />
            <p className="text-xs text-(--ws-muted)">{t('problemManager.empty')}</p>
          </div>
        ) : (
          problems.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-(--ws-hover) transition-colors">
              <span className="text-xs text-(--ws-muted) font-mono w-5 shrink-0">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-(--ws-text) truncate">{p.title || t('problemManager.untitled')}</p>
                  {p.problem_id && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-(--ws-info-soft) text-(--ws-info) border border-(--ws-info)/35 font-bold shrink-0">
                      LINKED
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-(--ws-muted) truncate">{p.statement?.slice(0, 60) || t('problemManager.noDescription')}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${diffChip[p.difficulty]}`}>
                {t(`problemForm.${diffLabel[p.difficulty]}`)}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={p.points ?? 100}
                  onChange={(e) => updatePoints(p.id, Number(e.target.value))}
                  className="w-16 px-2 py-1 text-xs font-semibold text-right bg-(--ws-panel2) border border-(--ws-border) rounded-lg text-(--ws-text) focus:outline-none focus:bg-(--ws-panel) focus:ring-1 focus:ring-(--ws-accent)"
                  title={t('problemManager.editPoints')}
                />
                <span className="text-[11px] text-(--ws-muted)">{t('problemManager.pointsShort')}</span>
              </div>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="p-1.5 text-(--ws-muted) hover:text-(--ws-danger) rounded-md transition-colors shrink-0"
                title={t('problemManager.delete')}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <p className="text-[11px] text-(--ws-muted) mt-1.5">
        <Lightbulb size={14} className="inline-block align-[-2px] mr-1" aria-hidden="true" /><strong>{t('problemManager.createNew')}</strong>: {t('problemManager.helper')}
      </p>

      {/* ───── Modal: Liên kết từ Ngân hàng ───── */}
      {modalType === 'link' && hasDocument && createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-200 flex items-center justify-center p-4"
          onClick={() => !linkingId && setModalType(null)}
        >
          <div
            className="bg-(--ws-panel2) border border-(--ws-border) rounded-2xl w-full max-w-xl shadow-2xl animate-slide-up flex flex-col max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--ws-border) bg-(--ws-panel2) shrink-0">
              <div>
                <h4 className="text-base font-bold text-(--ws-text) flex items-center gap-2">
                  <Link2 size={17} className="text-(--ws-info)" /> {t('problemManager.linkTitle')}
                </h4>
                <p className="text-xs text-(--ws-muted) mt-0.5">
                  {t('problemManager.linkSubtitle')}
                </p>
              </div>
              <button aria-label={t('common.close')}
                type="button"
                onClick={() => setModalType(null)}
                disabled={!!linkingId}
                className="p-2 rounded-xl text-(--ws-muted) hover:bg-(--ws-hover) hover:text-(--ws-text) transition-colors"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-(--ws-border) bg-(--ws-panel) shrink-0">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--ws-muted)" />
                <input
                  autoFocus
                  value={linkSearch}
                  onChange={(e) => { setLinkSearch(e.target.value); setLinkErr(''); }}
                  placeholder={t('problemManager.search')}
                  className="w-full pl-10 pr-4 py-2.5 bg-(--ws-panel2) border border-(--ws-border) rounded-xl text-sm text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:bg-(--ws-panel) focus:ring-2 focus:ring-(--ws-accent)"
                />
              </div>
              {linkErr && <p className="text-xs text-(--ws-danger) font-medium mt-2">{linkErr}</p>}
            </div>

            {/* List */}
            <div className="overflow-y-auto p-4 space-y-2 flex-1">
              {bankFiltered.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText size={36} className="text-(--ws-faint) mx-auto mb-2" />
                  <p className="text-sm text-(--ws-muted)">{t('problemManager.notFound')}</p>
                </div>
              ) : (
                bankFiltered.map((bp) => {
                  const alreadyAdded = problems.some((p) => p.problem_id === bp.id);
                  const isLinking = linkingId === bp.id;
                  return (
                    <div
                      key={bp.id}
                      className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                        alreadyAdded
                          ? 'border-(--ws-border) bg-(--ws-panel2)/60 opacity-60'
                          : 'border-(--ws-border) bg-(--ws-panel) hover:border-(--ws-accent)/40 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-(--ws-text) truncate">{bp.title}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold shrink-0 ${
                            bp.difficulty === 'EASY' ? 'bg-(--ws-ok-soft) text-(--ws-ok) border-(--ws-ok)/35' :
                            bp.difficulty === 'MEDIUM' ? 'bg-(--ws-warn-soft) text-(--ws-warn) border-(--ws-warn)/35' :
                            'bg-(--ws-danger-soft) text-(--ws-danger) border-(--ws-danger)/35'
                          }`}>
                            {t(`problemForm.${bp.difficulty.toLowerCase()}`)}
                          </span>
                        </div>
                        <p className="text-xs text-(--ws-muted) line-clamp-1 mb-1.5">
                          {bp.description || t('problemManager.detailUnavailable')}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-(--ws-muted)">
                          <span className="font-mono text-(--ws-text)">{bp.id}</span>
                          <span className="flex items-center gap-1"><Clock size={11} />{bp.time_limit}ms</span>
                          <span className="flex items-center gap-1"><HardDrive size={11} />{bp.memory_limit}MB</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => !alreadyAdded && !linkingId && linkFromBank(bp.id)}
                        disabled={alreadyAdded || !!linkingId}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                          alreadyAdded
                            ? 'bg-(--ws-ok-soft) text-(--ws-ok) cursor-not-allowed border border-(--ws-ok)/35'
                            : 'bg-(--ws-accent) text-(--ws-on-accent) hover:bg-(--ws-accent-strong) shadow-sm disabled:opacity-50'
                        }`}
                      >
                        {isLinking ? (
                          <>
                            <Loader2 size={13} className="animate-spin" /> {t('problemManager.adding')}
                          </>
                        ) : alreadyAdded ? (
                          <>
                            <Check size={13} /> {t('problemManager.added')}
                          </>
                        ) : (
                          <>
                            <Plus size={13} /> {t('problemManager.add')}
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-(--ws-border) bg-(--ws-panel2) flex justify-between items-center shrink-0">
              <span className="text-xs text-(--ws-muted)">
                {t('problemManager.bankCount', { count: bankFiltered.length })}
              </span>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-5 py-2 bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) font-medium text-xs rounded-xl hover:bg-(--ws-hover) transition-colors"
              >
                {t('problemManager.close')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ───── Modal: Soạn bài mới (Full ProblemFormModal) ───── */}
      <ProblemFormModal
        isOpen={modalType === 'compose'}
        onClose={() => !composeSaving && setModalType(null)}
        onSubmit={handleComposeSubmit}
        isLoading={composeSaving}
        onImportedProblems={handleImportedProblems}
        showPoints
        initialPoints={100}
        titleText={t('problemManager.createForHomework')}
        subtitleText={t('problemManager.createSubtitle')}
        submitText={t('problemManager.createAndAdd')}
      />
    </div>
  );
}
