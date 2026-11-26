import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSkillCatalogQuery } from '../../api/skills';

/**
 * Nhãn kỹ năng nhỏ của một bài. linkBase có thì mỗi nhãn là link mở Kho bài tập lọc theo kỹ năng đó.
 * Dùng trong thẻ <a> (Kho bài tập) thì để linkBase trống — không được lồng link trong link.
 */
export default function SkillChips({
  codes,
  max = 3,
  linkBase,
  size = 'sm',
}: {
  codes?: string[];
  max?: number;
  linkBase?: string;
  size?: 'sm' | 'md';
}) {
  const { i18n, t } = useTranslation();
  const en = i18n.language?.startsWith('en');
  const { data: catalog = [] } = useSkillCatalogQuery(!!codes?.length);
  const nameOf = useMemo(() => new Map(catalog.map((s) => [s.code, en ? s.name_en : s.name_vi])), [catalog, en]);
  if (!codes?.length) return null;
  const shown = codes.slice(0, max);
  const rest = codes.length - shown.length;
  const cls =
    size === 'md'
      ? 'inline-flex items-center min-h-7 px-2.5 rounded-full border border-(--ws-accent)/30 bg-(--ws-accent)/8 text-(--ws-accent) text-xs font-semibold'
      : 'inline-flex items-center px-2 py-0.5 rounded-full border border-(--ws-border) bg-(--ws-panel2) text-(--ws-muted) text-[11px] font-medium';
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={t('skills.chips.label')}>
      {shown.map((code) => (
        <li key={code}>
          {linkBase ? (
            <Link to={`${linkBase}?skill=${code}`} className={`${cls} hover:border-(--ws-accent) hover:text-(--ws-accent)`}>
              {nameOf.get(code) ?? code}
            </Link>
          ) : (
            <span className={cls}>{nameOf.get(code) ?? code}</span>
          )}
        </li>
      ))}
      {rest > 0 && (
        <li>
          <span className={cls}>+{rest}</span>
        </li>
      )}
    </ul>
  );
}
