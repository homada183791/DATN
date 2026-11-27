import { useState } from 'react';
import { Flame, CheckCircle2, Award, Crown } from 'lucide-react';
import { useTopRatedUsersQuery } from '../api/users';
import { useTranslation } from 'react-i18next';

function getRatingBadgeColor(rating: number): string {
  if (rating >= 1800) return 'text-(--ws-info) bg-(--ws-info-soft) border-(--ws-info)/35';
  if (rating >= 1500) return 'text-(--ws-info) bg-(--ws-info-soft) border-(--ws-info)/35';
  if (rating >= 1300) return 'text-(--ws-ok) bg-(--ws-ok-soft) border-(--ws-ok)/35';
  return 'text-(--ws-accent) bg-(--ws-panel2) border-(--ws-border)';
}

function getRankBadge(rank: number, t: (key: string) => string) {
  if (rank === 1) {
    return (
      <div className="w-6 h-6 rounded-full bg-(--ws-warn) text-(--ws-on-accent) flex items-center justify-center font-bold font-mono tabular-nums text-xs shadow-xs" title={t('widgets.rankGold')}>
        1
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-6 h-6 rounded-full bg-(--ws-panel2) border border-(--ws-border) text-(--ws-text) flex items-center justify-center font-bold font-mono tabular-nums text-xs" title={t('widgets.rankSilver')}>
        2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-6 h-6 rounded-full bg-(--ws-warn-soft) border border-(--ws-warn)/45 text-(--ws-warn) flex items-center justify-center font-bold font-mono tabular-nums text-xs" title={t('widgets.rankBronze')}>
        3
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-full bg-(--ws-panel2) text-(--ws-muted) flex items-center justify-center font-bold font-mono tabular-nums text-xs">
      {rank}
    </div>
  );
}

interface Props {
  maxItems?: number;
  showTitle?: boolean;
}

export default function TopRatedLeaderboard({ maxItems = 5, showTitle = true }: Props) {
  const { t } = useTranslation();
  const { data: users = [], isLoading, error } = useTopRatedUsersQuery(10);
  const [showAll, setShowAll] = useState(false);

  const displayUsers = showAll ? users : users.slice(0, maxItems);

  if (isLoading) {
    return (
      <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-5 shadow-xs">
        {showTitle && (
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-(--ws-border)">
            <Crown size={18} className="text-(--ws-accent)" />
            <h3 className="text-base font-bold text-(--ws-text)">{t('widgets.leaderboardTitle')}</h3>
          </div>
        )}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl ws-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (error || users.length === 0) {
    return (
      <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-5 shadow-xs text-center">
        {showTitle && (
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-(--ws-border) text-left">
            <Crown size={18} className="text-(--ws-accent)" />
            <h3 className="text-base font-bold text-(--ws-text)">{t('widgets.leaderboardTitle')}</h3>
          </div>
        )}
        <Award size={32} className="text-(--ws-faint) mx-auto mb-2" />
        <p className="text-xs text-(--ws-muted)">{t('widgets.leaderboardEmpty')}</p>
      </div>
    );
  }

  return (
    <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-5 shadow-xs">
      {showTitle && (
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-(--ws-border)">
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-(--ws-accent)" />
            <div>
              <h3 className="text-base font-bold text-(--ws-text) font-serif">{t('widgets.topRatedTitle')}</h3>
              <p className="text-[11px] text-(--ws-muted)">{t('widgets.topRatedSubtitle')}</p>
            </div>
          </div>
          {users.length > maxItems && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-(--ws-accent) hover:text-(--ws-accent) font-semibold hover:underline"
            >
              {showAll ? t('widgets.collapse') : t('widgets.showTop', { count: users.length })}
            </button>
          )}
        </div>
      )}

      <div className="space-y-2">
        {displayUsers.map((u, idx) => {
          const rank = idx + 1;
          const displayName = u.full_name?.trim() || u.username;
          const initial = displayName.charAt(0).toUpperCase();

          return (
            <div
              key={u.id}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                rank <= 3
                  ? 'bg-(--ws-panel2) border-(--ws-warn)/30 hover:border-(--ws-warn)/60 shadow-2xs'
                  : 'bg-(--ws-panel2)/60 border-(--ws-border) hover:border-(--ws-accent)/40'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0">{getRankBadge(rank, t)}</div>

                <div className="w-8 h-8 rounded-full bg-linear-to-br from-(--ws-accent-strong) to-(--ws-accent) text-(--ws-on-accent) flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {initial}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-(--ws-text) truncate">{displayName}</p>
                    {u.student_code && (
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-md bg-(--ws-panel2) text-(--ws-text)">
                        {u.student_code}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-(--ws-muted) mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <CheckCircle2 size={11} className="text-(--ws-ok)" /> {u.solved_count} AC
                    </span>
                    {u.current_streak > 0 && (
                      <span className="flex items-center gap-0.5 text-(--ws-warn) font-medium">
                        <Flame size={11} className="text-(--ws-warn) fill-(--ws-warn)" /> {u.current_streak}d
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 pl-3">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-lg border text-xs font-bold font-mono ${getRatingBadgeColor(
                    u.elo_rating
                  )}`}
                >
                  {u.elo_rating}
                </span>
                <span className="block text-[9.5px] text-(--ws-muted) mt-0.5">Rating</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}