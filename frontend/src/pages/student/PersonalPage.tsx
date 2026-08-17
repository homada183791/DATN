import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Calendar,
  Award,
  BookOpen,
  Send,
  Trophy,
  TrendingUp,
  Code2,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import { submissions, problems, skillRadar } from '../../data/mockData';

export default function PersonalPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const mySubmissions = submissions.filter((s) => s.userId === user?.id);
  const acSubmissions = mySubmissions.filter((s) => s.verdict === 'AC');
  const solvedProblemIds = [...new Set(acSubmissions.map((s) => s.problemId))];
  const solvedProblems = problems.filter((p) => solvedProblemIds.includes(p.id));

  const verdictStats = {
    AC: mySubmissions.filter((s) => s.verdict === 'AC').length,
    WA: mySubmissions.filter((s) => s.verdict === 'WA').length,
    TLE: mySubmissions.filter((s) => s.verdict === 'TLE').length,
    MLE: mySubmissions.filter((s) => s.verdict === 'MLE').length,
    RTE: mySubmissions.filter((s) => s.verdict === 'RTE').length,
    CE: mySubmissions.filter((s) => s.verdict === 'CE').length,
    PE: mySubmissions.filter((s) => s.verdict === 'PE').length,
  };

  const totalSubs = mySubmissions.length || 1;

  const categoryStats: Record<string, { solved: number; total: number }> = {};
  problems.forEach((p) => {
    if (!categoryStats[p.category]) categoryStats[p.category] = { solved: 0, total: 0 };
    categoryStats[p.category].total++;
    if (solvedProblemIds.includes(p.id)) categoryStats[p.category].solved++;
  });

  const ratingHistory = [
    { month: t('months.9'), rating: 1200 },
    { month: t('months.10'), rating: 1350 },
    { month: t('months.11'), rating: 1520 },
    { month: t('months.12'), rating: 1680 },
    { month: t('months.1'), rating: 1847 },
  ];

  const maxRating = Math.max(...ratingHistory.map((r) => r.rating));

  return (
    <div className="space-y-6 text-[#191919]">
      {/* Profile Header */}
      <div className="bg-white border border-[#e5dac9] rounded-2xl overflow-hidden shadow-sm">
        <div className="h-32 bg-gradient-to-r from-[#193a2b]/20 via-[#e5dac9]/30 to-[#cc5a37]/20 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9zdmc+')] opacity-50" />
        </div>
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
            <div className="w-24 h-24 bg-gradient-to-br from-[#193a2b] to-[#2d5a3f] rounded-2xl flex items-center justify-center text-white text-3xl font-bold font-serif border-4 border-white shadow-lg">
              {user?.fullName?.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-[#191919] font-serif">{user?.fullName}</h2>
              <p className="text-[#8a8073] text-sm">@{user?.username}</p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-[#5c5446]">
                <span className="flex items-center gap-1">
                  <MapPin size={14} className="text-[#8a8073]" /> {user?.institution}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={14} className="text-[#8a8073]" /> {t('personal.joined', { date: user?.joinDate })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-xl">
              <Trophy size={20} className="text-yellow-600" />
              <span className="text-xl font-bold text-yellow-600 font-serif">{user?.rating}</span>
              <span className="text-xs text-yellow-700/60 font-medium">Rating</span>
            </div>
          </div>
          <p className="mt-4 text-[#5c5446] text-sm leading-relaxed">{user?.bio}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 text-center shadow-sm">
          <CheckCircle2 size={24} className="text-[#193a2b] mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif text-[#191919]">{solvedProblemIds.length}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">{t('instructorContest.colSolved')}</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 text-center shadow-sm">
          <Send size={24} className="text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif text-[#191919]">{mySubmissions.length}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">{t('instructorStudent.sortSubmissions')}</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 text-center shadow-sm">
          <Award size={24} className="text-yellow-600 mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif text-[#191919]">{user?.rating}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Rating</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 text-center shadow-sm">
          <TrendingUp size={24} className="text-purple-600 mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif text-[#191919]">
            {mySubmissions.length ? Math.round((acSubmissions.length / mySubmissions.length) * 100) : 0}%
          </p>
          <p className="text-xs text-[#8a8073] mt-0.5">{t('instructorDashboard.acRate')}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Rating History */}
        <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#191919] font-serif mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-[#193a2b]" /> {t('personal.ratingHistory')}
          </h3>
          <div className="flex items-end gap-4 h-40">
            {ratingHistory.map((r, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs text-[#193a2b] font-semibold">{r.rating}</span>
                <div
                  className="w-full bg-gradient-to-t from-[#193a2b] to-[#2d5a3f] rounded-t-lg transition-all hover:opacity-85"
                  style={{ height: `${(r.rating / maxRating) * 120}px` }}
                />
                <span className="text-xs text-[#8a8073]">{r.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Verdict Distribution */}
        <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#191919] font-serif mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-purple-600" /> {t('personal.verdictDistribution')}
          </h3>
          <div className="space-y-3">
            {Object.entries(verdictStats).map(([verdict, count]) => {
              const colors: Record<string, string> = {
                AC: 'from-emerald-600 to-emerald-400',
                WA: 'from-red-600 to-red-400',
                TLE: 'from-yellow-500 to-yellow-400',
                MLE: 'from-yellow-500 to-yellow-400',
                RTE: 'from-orange-500 to-orange-400',
                CE: 'from-blue-500 to-blue-400',
                PE: 'from-pink-500 to-pink-400',
              };
              const textColors: Record<string, string> = {
                AC: 'text-emerald-700',
                WA: 'text-red-700',
                TLE: 'text-yellow-700',
                MLE: 'text-yellow-700',
                RTE: 'text-orange-700',
                CE: 'text-blue-700',
                PE: 'text-pink-700',
              };
              return (
                <div key={verdict} className="flex items-center gap-3">
                  <span className={`text-sm font-bold w-8 ${textColors[verdict]}`}>{verdict}</span>
                  <div className="flex-1 bg-[#f0ebd9] rounded-full h-3">
                    <div
                      className={`bg-gradient-to-r ${colors[verdict]} h-3 rounded-full transition-all`}
                      style={{ width: `${(count / totalSubs) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-[#5c5446] w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Skills */}
        <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#191919] font-serif mb-4 flex items-center gap-2">
            <Code2 size={20} className="text-emerald-600" /> {t('personal.skills')}
          </h3>
          <div className="space-y-3">
            {skillRadar.map((s) => (
              <div key={s.skill}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[#5c5446]">{s.skill}</span>
                  <span className="text-sm text-[#193a2b] font-medium">{s.score}%</span>
                </div>
                <div className="w-full bg-[#f0ebd9] rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-[#193a2b] to-[#2d5a3f] h-2 rounded-full"
                    style={{ width: `${s.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Progress */}
        <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#191919] font-serif mb-4 flex items-center gap-2">
            <BookOpen size={20} className="text-yellow-600" /> {t('personal.progressByTopic')}
          </h3>
          <div className="space-y-3">
            {Object.entries(categoryStats).map(([category, stats]) => (
              <div key={category} className="p-3 bg-[#f7f4eb]/50 rounded-lg border border-[#e5dac9]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[#191919] font-medium">{category}</span>
                  <span className="text-xs text-[#8a8073]">{stats.solved}/{stats.total}</span>
                </div>
                <div className="w-full bg-[#f0ebd9] rounded-full h-2 mt-1.5">
                  <div
                    className="bg-gradient-to-r from-emerald-600 to-teal-500 h-2 rounded-full"
                    style={{ width: `${stats.total ? (stats.solved / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Solved Problems */}
      <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-[#191919] font-serif mb-4">{t('personal.solvedProblems')}</h3>
        <div className="flex flex-wrap gap-2">
          {solvedProblems.map((p) => {
            const colors: Record<string, string> = {
              Easy: 'bg-emerald-100 text-emerald-800 border-emerald-200',
              Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
              Hard: 'bg-red-100 text-red-800 border-red-200',
            };
            return (
              <span
                key={p.id}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${colors[p.difficulty]}`}
              >
                {p.id} - {p.title}
              </span>
            );
          })}
          {solvedProblems.length === 0 && (
            <p className="text-sm text-[#8a8073]">{t('personal.noSolvedYet')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
