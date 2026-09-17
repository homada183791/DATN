import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Calendar, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { ContestDto } from '../api/contests';
import { formatVNFull } from '../utils/dateTime';

interface Props {
  contests: ContestDto[];
  userRole?: 'student' | 'instructor';
}

interface TimeRemaining {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeRemaining(targetTime: string): TimeRemaining {
  const total = new Date(targetTime).getTime() - Date.now();
  if (total <= 0) {
    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { total, days, hours, minutes, seconds };
}

export default function UpcomingContestCountdown({ contests, userRole = 'student' }: Props) {
  // Tìm kỳ thi sắp diễn ra gần nhất
  const upcomingContests = useMemo(() => {
    return contests
      .filter((c) => c.status === 'upcoming')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [contests]);

  const nextContest = upcomingContests[0];

  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(() =>
    nextContest ? calculateTimeRemaining(nextContest.startTime) : { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 }
  );

  useEffect(() => {
    if (!nextContest) return;

    setTimeLeft(calculateTimeRemaining(nextContest.startTime));

    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining(nextContest.startTime);
      setTimeLeft(remaining);
      if (remaining.total <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [nextContest]);

  const targetLink = userRole === 'instructor' ? '/instructor/contest' : '/student/contest';

  if (!nextContest) {
    return (
      <div className="bg-white border border-[#e5dac9] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#f0ebd9] text-[#193a2b] flex items-center justify-center flex-shrink-0">
            <Trophy size={18} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#191919]">Kỳ thi sắp diễn ra</h4>
            <p className="text-xs text-[#8a8073] mt-0.5">Hiện chưa có kỳ thi nào được lên lịch trong thời gian tới.</p>
          </div>
        </div>
        <Link
          to={targetLink}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#f7f4eb] border border-[#e5dac9] text-xs font-semibold text-[#193a2b] rounded-lg hover:bg-[#e5dac9] transition-colors"
        >
          Xem tất cả kỳ thi <ArrowRight size={13} />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#e5dac9] rounded-2xl p-5 shadow-xs hover:border-[#193a2b]/30 transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#193a2b] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <Trophy size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                <Clock size={11} /> Sắp diễn ra
              </span>
              <span className="text-xs text-[#8a8073]">
                {formatVNFull(nextContest.startTime)}
              </span>
            </div>
            <h4 className="text-base font-bold text-[#191919] mt-1 hover:text-[#193a2b] transition-colors">
              {nextContest.title}
            </h4>
          </div>
        </div>

        <Link
          to={targetLink}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#193a2b] text-white text-xs font-semibold rounded-xl hover:bg-[#143022] transition-colors shadow-xs flex-shrink-0 self-start md:self-center"
        >
          Chi tiết kỳ thi <ArrowRight size={13} />
        </Link>
      </div>

      {/* Countdown Grid */}
      <div className="grid grid-cols-4 gap-2 pt-3 border-t border-[#f0ebd9]">
        <div className="bg-[#f7f4eb] border border-[#e5dac9] rounded-xl py-2 px-3 text-center">
          <span className="block text-lg font-bold font-mono text-[#191919] leading-tight">
            {String(timeLeft.days).padStart(2, '0')}
          </span>
          <span className="text-[10px] font-semibold text-[#8a8073] uppercase tracking-wider">Ngày</span>
        </div>

        <div className="bg-[#f7f4eb] border border-[#e5dac9] rounded-xl py-2 px-3 text-center">
          <span className="block text-lg font-bold font-mono text-[#191919] leading-tight">
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className="text-[10px] font-semibold text-[#8a8073] uppercase tracking-wider">Giờ</span>
        </div>

        <div className="bg-[#f7f4eb] border border-[#e5dac9] rounded-xl py-2 px-3 text-center">
          <span className="block text-lg font-bold font-mono text-[#191919] leading-tight">
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span className="text-[10px] font-semibold text-[#8a8073] uppercase tracking-wider">Phút</span>
        </div>

        <div className="bg-[#f7f4eb] border border-[#e5dac9] rounded-xl py-2 px-3 text-center">
          <span className="block text-lg font-bold font-mono text-[#193a2b] leading-tight">
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className="text-[10px] font-semibold text-[#193a2b] uppercase tracking-wider">Giây</span>
        </div>
      </div>
    </div>
  );
}
