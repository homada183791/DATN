import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api/http';
import { useSubmissionsQuery } from '../../api/submissions';
import { formatVNFull } from '../../utils/dateTime';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Send,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

interface SubmissionRow {
  id: string;
  problemId: string;
  problemTitle: string;
  userId: string;
  username: string;
  language: string;
  verdict: string;
  executionTime: number | null;
  memory: number | null;
  timestamp: string;
  code: string;
}

const verdictByStatus: Record<string, string> = {
  PENDING: 'PENDING',
  IN_QUEUE: 'IN_QUEUE',
  ACCEPTED: 'AC',
  WRONG_ANSWER: 'WA',
  TIME_LIMIT_EXCEEDED: 'TLE',
  COMPILE_ERROR: 'CE',
  RUNTIME_ERROR: 'RTE',
};

export default function Submission() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, error } = useSubmissionsQuery();
  const [searchQuery, setSearchQuery] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const hasDocument = typeof document !== 'undefined';

  const allSubmissions: SubmissionRow[] = (data ?? []).map((submission) => ({
    id: submission.id,
    problemId: submission.problem_id,
    problemTitle: submission.problem_title,
    userId: submission.user_id,
    username: submission.username,
    language: submission.language,
    verdict: verdictByStatus[submission.status] ?? submission.status,
    executionTime: submission.execution_time,
    memory: submission.memory_used,
    timestamp: submission.created_at,
    code: submission.source_code,
  }));

  const filteredSubmissions = allSubmissions.filter((s) => {
    const matchesSearch = s.problemTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVerdict = verdictFilter === 'all' || s.verdict === verdictFilter;
    const matchesLanguage = languageFilter === 'all' || s.language === languageFilter;
    return matchesSearch && matchesVerdict && matchesLanguage;
  });

  const selectedSub = allSubmissions.find((s) => s.id === selectedSubmission);

  const verdictColors: Record<string, string> = {
    AC: 'text-emerald-800 bg-emerald-100 border-emerald-300',
    WA: 'text-red-800 bg-red-100 border-red-300',
    TLE: 'text-yellow-800 bg-yellow-100 border-yellow-300',
    MLE: 'text-yellow-800 bg-yellow-100 border-yellow-300',
    RTE: 'text-orange-800 bg-orange-100 border-orange-300',
    CE: 'text-blue-800 bg-blue-100 border-blue-300',
    PE: 'text-pink-800 bg-pink-100 border-pink-300',
    PENDING: 'text-amber-800 bg-amber-100 border-amber-300',
    IN_QUEUE: 'text-sky-800 bg-sky-100 border-sky-300',
  };

  const verdictFullNames: Record<string, string> = {
    AC: 'Accepted',
    WA: 'Wrong Answer',
    TLE: 'Time Limit Exceeded',
    MLE: 'Memory Limit Exceeded',
    RTE: 'Runtime Error',
    CE: 'Compilation Error',
    PE: 'Presentation Error',
    PENDING: 'Đang chờ chấm',
    IN_QUEUE: 'Trong hàng đợi',
  };

  const languages = [...new Set(allSubmissions.map((s) => s.language))];

  if (isLoading) {
    return <div className="p-10 text-center text-sm text-[#8a8073]">Đang tải lịch sử bài nộp...</div>;
  }

  if (error instanceof ApiError) {
    return (
      <div className="rounded-2xl border border-[#e5dac9] bg-white p-10 text-center shadow-sm">
        <AlertTriangle size={40} className="text-[#bfae99] mx-auto mb-3" />
        <h2 className="text-xl font-bold text-[#191919]">Không thể tải lịch sử bài nộp</h2>
        <p className="mt-2 text-sm text-[#8a8073]">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#191919]">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-serif text-[#191919]">Bài nộp</h2>
        <span className="text-sm text-[#8a8073]">{filteredSubmissions.length} kết quả</span>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8073]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm theo tên bài hoặc người dùng..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
            showFilters ? 'bg-[#193a2b]/10 border-[#193a2b]/30 text-[#193a2b]' : 'bg-white border-[#e5dac9] text-[#5c5446] hover:text-[#191919]'
          }`}
        >
          <Filter size={16} /> Bộ lọc <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-4 p-4 bg-white border border-[#e5dac9] rounded-xl shadow-sm">
          <div>
            <label className="block text-xs text-[#8a8073] mb-1.5 font-semibold uppercase tracking-wider">Kết quả</label>
            <select
              value={verdictFilter}
              onChange={(e) => setVerdictFilter(e.target.value)}
              className="px-3 py-2 bg-[#f7f4eb] border border-[#e5dac9] rounded-lg text-sm text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
            >
              <option value="all">Tất cả</option>
              <option value="AC">Accepted</option>
              <option value="WA">Wrong Answer</option>
              <option value="TLE">Time Limit</option>
              <option value="RTE">Runtime Error</option>
              <option value="CE">Compile Error</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#8a8073] mb-1.5 font-semibold uppercase tracking-wider">Ngôn ngữ</label>
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="px-3 py-2 bg-[#f7f4eb] border border-[#e5dac9] rounded-lg text-sm text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
            >
              <option value="all">Tất cả</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Submission Detail Modal */}
      {selectedSubmission && selectedSub && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-[90] flex items-center justify-center p-4" onClick={() => setSelectedSubmission(null)}>
          <div className="bg-[#f7f4eb] border border-[#e5dac9] rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[#e5dac9]">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-serif font-bold text-[#191919]">{selectedSub.problemTitle}</h3>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${verdictColors[selectedSub.verdict]}`}>
                  {selectedSub.verdict}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => selectedSub && navigate(`/student/problem/${selectedSub.problemId}`)}
                  className="flex items-center gap-1.5 rounded-lg border border-[#193a2b]/20 bg-[#193a2b]/10 px-3 py-2 text-sm font-medium text-[#193a2b] hover:bg-[#193a2b]/20"
                >
                  <ExternalLink size={15} />
                  Đi đến bài tập
                </button>
                <button onClick={() => setSelectedSubmission(null)} className="text-[#8a8073] hover:text-[#191919]">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="p-3 bg-white rounded-xl border border-[#e5dac9] text-center shadow-sm">
                  <p className="text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">Ngôn ngữ</p>
                  <p className="text-sm text-[#191919] font-semibold">{selectedSub.language}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#e5dac9] text-center shadow-sm">
                  <p className="text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">Thời gian</p>
                  <p className="text-sm text-[#191919] font-semibold">{selectedSub.executionTime !== null && selectedSub.executionTime !== undefined ? `${selectedSub.executionTime}ms` : '—'}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#e5dac9] text-center shadow-sm">
                  <p className="text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">Bộ nhớ</p>
                  <p className="text-sm text-[#191919] font-semibold">{selectedSub.memory !== null && selectedSub.memory !== undefined ? `${selectedSub.memory}MB` : '—'}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#e5dac9] text-center shadow-sm">
                  <p className="text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">Thời điểm</p>
                   <p className="text-sm text-[#191919] font-semibold">{formatVNFull(selectedSub.timestamp)}</p>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-bold text-[#191919] font-serif mb-2">Mã nguồn</h4>
                <div className="bg-[#242424] border border-[#333333] rounded-xl p-4 overflow-x-auto shadow-inner">
                  <pre className="text-sm text-emerald-400 font-mono whitespace-pre">{selectedSub.code}</pre>
                </div>
              </div>

              {selectedSub.verdict !== 'AC' && selectedSub.verdict !== 'CE' && selectedSub.verdict !== 'PENDING' && selectedSub.verdict !== 'IN_QUEUE' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-red-700" />
                    <span className="text-sm font-bold text-red-700 font-serif">{verdictFullNames[selectedSub.verdict] || selectedSub.verdict}</span>
                  </div>
                  <p className="text-xs text-red-600 leading-relaxed">
                    {selectedSub.verdict === 'WA' && 'Kết quả không chính xác trên một số bộ test dữ liệu. Vui lòng kiểm tra lại tính đúng đắn của thuật toán.'}
                    {selectedSub.verdict === 'TLE' && 'Chương trình chạy vượt quá giới hạn thời gian cho phép. Cần tối ưu thuật toán có độ phức tạp thời gian tốt hơn.'}
                    {selectedSub.verdict === 'RTE' && 'Chương trình phát sinh lỗi trong quá trình thực thi. Ví dụ: truy cập mảng ngoài biên, chia cho 0.'}
                  </p>
                </div>
              )}
              {(selectedSub.verdict === 'PENDING' || selectedSub.verdict === 'IN_QUEUE') && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-amber-800 font-serif">Đang chờ chấm bài</span>
                  </div>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Bài nộp đang nằm trong hàng đợi của hệ thống chấm bài. Vui lòng chờ ít phút hoặc tải lại trang.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Submissions Table */}
      <div className="bg-white border border-[#e5dac9] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e5dac9] bg-[#f0ebd9]/50">
                <th className="text-left text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">ID</th>
                <th className="text-left text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">Bài toán</th>
                {user?.role === 'instructor' && (
                  <th className="text-left text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">Người nộp</th>
                )}
                <th className="text-left text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">Kết quả</th>
                <th className="text-left text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">Ngôn ngữ</th>
                <th className="text-right text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">Thời gian</th>
                <th className="text-right text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">Bộ nhớ</th>
                <th className="text-right text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">Thời điểm</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-[#e5dac9]/50 hover:bg-[#f7f4eb]/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedSubmission(sub.id)}
                >
                  <td className="py-3 px-4 text-sm text-[#8a8073]">{sub.id}</td>
                  <td className="py-3 px-4 text-sm text-[#191919] font-semibold">{sub.problemTitle}</td>
                  {user?.role === 'instructor' && (
                    <td className="py-3 px-4 text-sm text-[#5c5446]">@{sub.username}</td>
                  )}
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${verdictColors[sub.verdict] ?? 'text-gray-700 bg-gray-100 border-gray-300'}`}>
                      {sub.verdict}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-[#5c5446]">{sub.language}</td>
                  <td className="py-3 px-4 text-sm text-[#5c5446] text-right">{sub.executionTime != null ? `${sub.executionTime}ms` : '—'}</td>
                  <td className="py-3 px-4 text-sm text-[#5c5446] text-right">{sub.memory != null ? `${sub.memory}MB` : '—'}</td>
                   <td className="py-3 px-4 text-sm text-[#8a8073] text-right">{formatVNFull(sub.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredSubmissions.length === 0 && (
          <div className="p-12 text-center">
            <Send size={48} className="text-[#bfae99] mx-auto mb-4" />
            <p className="text-[#8a8073]">Không tìm thấy bài nộp nào</p>
          </div>
        )}
      </div>
    </div>
  );
}
