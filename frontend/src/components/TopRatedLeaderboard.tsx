import { useState } from 'react';
import { Trophy, Flame, CheckCircle2, ChevronRight, Award, Medal, Crown } from 'lucide-react';
import { useTopRatedUsersQuery, TopRatedUserDto } from '../api/users';

function getMSSV(email: string, username?: string | null, id?: string): string {
  const emailMatch = email.match(/^(\d{6,10})/);
  if (emailMatch) return emailMatch[1];
  if (username && /^\d{6,10}$/.test(username)) return username;
  const userMatch = username?.match(/\d{6,10}/);
  if (userMatch) return userMatch[0];
  return `SV${(id || email.split('@')[0]).slice(0, 6).toUpperCase()}`;
}

function getRatingBadgeColor(rating: number): string {
  if (rating >= 1800) return 'text-purple-700 bg-purple-50 border-purple-200';
  if (rating >= 1500) return 'text-blue-700 bg-blue-50 border-blue-200';
  if (rating >= 1300) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  return 'text-[#193a2b] bg-[#f0ebd9] border-[#e5dac9]';
}

function getRankBadge(rank: number) {
  if (rank === 1) {
    return (
      <div className="w-6 h-6 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-bold text-xs shadow-xs" title="Hạng 1 - Vàng">
        1
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-6 h-6 rounded-full bg-slate-300 text-slate-800 flex items-center justify-center font-bold text-xs shadow-xs" title="Hạng 2 - Bạc">
        2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-6 h-6 rounded-full bg-amber-700 text-amber-100 flex items-center justify-center font-bold text-xs shadow-xs" title="Hạng 3 - Đồng">
        3
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-full bg-[#f0ebd9] text-[#8a8073] flex items-center justify-center font-bold text-xs">
      {rank}
    </div>
  );
}

interface Props {
  maxItems?: number;
  showTitle?: boolean;
}

export default function TopRatedLeaderboard({ maxItems = 5, showTitle = true }: Props) {
  const { data: users = [], isLoading, error } = useTopRatedUsersQuery(10);
  const [showAll, setShowAll] = useState(false);

  const displayUsers = showAll ? users : users.slice(0, maxItems);

  if (isLoading) {
    return (
      <div className="bg-white border border-[#e5dac9] rounded-2xl p-5 shadow-xs">
        {showTitle && (
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#e5dac9]">
            <Crown size={18} className="text-[#193a2b]" />
            <h3 className="text-base font-bold text-[#191919]">Bảng xếp hạng toàn trường</h3>
          </div>
        )}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-[#f7f4eb] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || users.length === 0) {
    return (
      <div className="bg-white border border-[#e5dac9] rounded-2xl p-5 shadow-xs text-center">
        {showTitle && (
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#e5dac9] text-left">
            <Crown size={18} className="text-[#193a2b]" />
            <h3 className="text-base font-bold text-[#191919]">Bảng xếp hạng toàn trường</h3>
          </div>
        )}
        <Award size={32} className="text-[#bfae99] mx-auto mb-2" />
        <p className="text-xs text-[#8a8073]">Chưa có dữ liệu xếp hạng sinh viên.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#e5dac9] rounded-2xl p-5 shadow-xs">
      {showTitle && (
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-[#e5dac9]">
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-[#193a2b]" />
            <div>
              <h3 className="text-base font-bold text-[#191919] font-serif">Top Rated toàn trường</h3>
              <p className="text-[11px] text-[#8a8073]">Bảng vàng sinh viên có thành tích cao nhất</p>
            </div>
          </div>
          {users.length > maxItems && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-[#193a2b] hover:text-[#143022] font-semibold hover:underline"
            >
              {showAll ? 'Thu gọn' : `Xem top ${users.length}`}
            </button>
          )}
        </div>
      )}

      <div className="space-y-2">
        {displayUsers.map((u, idx) => {
          const rank = idx + 1;
          const mssv = getMSSV(u.email, u.username, u.id);
          const initial = (u.username || u.email.split('@')[0]).charAt(0).toUpperCase();

          return (
            <div
              key={u.id}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                rank <= 3
                  ? 'bg-[#f7f4eb] border-amber-500/30 hover:border-amber-500/60 shadow-2xs'
                  : 'bg-[#f7f4eb]/60 border-[#e5dac9] hover:border-[#193a2b]/40'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0">{getRankBadge(rank)}</div>

                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#193a2b] to-[#2d5a3f] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                  {initial}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-[#191919] truncate">{u.username}</p>
                    <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-md bg-[#f0ebd9] text-[#5c5446]">
                      {mssv}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#8a8073] mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <CheckCircle2 size={11} className="text-emerald-600" /> {u.solved_count} AC
                    </span>
                    {u.current_streak > 0 && (
                      <span className="flex items-center gap-0.5 text-amber-700 font-medium">
                        <Flame size={11} className="text-amber-500 fill-amber-500" /> {u.current_streak}d
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right flex-shrink-0 pl-3">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-lg border text-xs font-bold font-mono ${getRatingBadgeColor(
                    u.elo_rating
                  )}`}
                >
                  {u.elo_rating}
                </span>
                <span className="block text-[9.5px] text-[#8a8073] mt-0.5">Rating</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
