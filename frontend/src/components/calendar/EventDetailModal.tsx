import { X, Calendar, Clock, BookOpen, Trophy, ExternalLink, GraduationCap } from 'lucide-react';
import { formatVNFull } from '../../utils/dateTime';

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'homework' | 'contest';
  dateStr: string; // YYYY-MM-DD (UTC+7)
  timeStr: string; // HH:mm (UTC+7)
  startDateTime: string; // ISO string
  endDateTime?: string; // ISO string
  className?: string;
  classId?: string;
  status: string;
  description?: string;
  link: string;
}

interface Props {
  event: CalendarEvent | null;
  onClose: () => void;
  userRole?: 'student' | 'instructor';
}

export default function EventDetailModal({ event, onClose, userRole = 'student' }: Props) {
  if (!event) return null;

  const isContest = event.type === 'contest';

  // URL tạo sự kiện trên Google Calendar
  const getGoogleCalendarUrl = () => {
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(
      `${event.description || ''}\n\nLớp: ${event.className || 'Toàn trường'}\nXem chi tiết tại JudgeHub: ${window.location.origin}${event.link}`
    );
    const location = encodeURIComponent('JudgeHub Online Judge');

    // Chuyển start và end sang định dạng YYYYMMDDTHHMMSSZ
    const toGCalDate = (isoStr: string) => {
      const d = new Date(isoStr);
      return d.toISOString().replace(/-|:|\.\d+/g, '');
    };

    const start = toGCalDate(event.startDateTime);
    const end = event.endDateTime ? toGCalDate(event.endDateTime) : start;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg bg-[var(--ws-panel)] border border-[var(--ws-border)] rounded-2xl shadow-xl overflow-hidden text-[var(--ws-text)]">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[var(--ws-border)]">
          <div className="flex items-center gap-3">
            <div
              style={{
                backgroundColor: isContest ? 'var(--ws-contest-bg)' : 'var(--ws-hw-bg)',
                color: isContest ? 'var(--ws-contest-text)' : 'var(--ws-hw-text)',
              }}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            >
              {isContest ? <Trophy size={20} /> : <BookOpen size={20} />}
            </div>
            <div>
              <span
                style={{
                  backgroundColor: isContest ? 'var(--ws-contest-bg)' : 'var(--ws-hw-bg)',
                  color: isContest ? 'var(--ws-contest-text)' : 'var(--ws-hw-text)',
                  borderColor: isContest ? 'var(--ws-contest-border)' : 'var(--ws-hw-border)',
                }}
                className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md border"
              >
                {isContest ? 'Kỳ thi' : 'Bài tập về nhà'}
              </span>
              <h3 className="text-lg font-bold font-serif text-[var(--ws-text)] mt-1">
                {event.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--ws-muted)] hover:text-[var(--ws-text)] hover:bg-[var(--ws-hover)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-sm">
          {/* Lớp học */}
          {event.className && (
            <div className="flex items-center gap-2.5 text-[var(--ws-muted)]">
              <GraduationCap size={16} className="text-[var(--ws-accent)] flex-shrink-0" />
              <span>
                Lớp học: <strong className="text-[var(--ws-text)]">{event.className}</strong>
              </span>
            </div>
          )}

          {/* Thời gian */}
          <div className="p-3.5 rounded-xl bg-[var(--ws-panel2)] border border-[var(--ws-border)] space-y-2">
            <div className="flex items-center gap-2.5 text-[var(--ws-muted)]">
              <Calendar size={15} className="text-[var(--ws-accent)] flex-shrink-0" />
              <span>
                {isContest ? 'Thời gian bắt đầu:' : 'Hạn chót nộp bài:'}{' '}
                <strong className="text-[var(--ws-text)]">
                  {formatVNFull(event.startDateTime)} (UTC+7)
                </strong>
              </span>
            </div>
            {isContest && event.endDateTime && (
              <div className="flex items-center gap-2.5 text-[var(--ws-muted)]">
                <Clock size={15} className="text-[var(--ws-accent)] flex-shrink-0" />
                <span>
                  Thời gian kết thúc:{' '}
                  <strong className="text-[var(--ws-text)]">
                    {formatVNFull(event.endDateTime)} (UTC+7)
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Mô tả */}
          {event.description ? (
            <div>
              <p className="text-xs font-semibold text-[var(--ws-muted)] uppercase tracking-wider mb-1">
                Mô tả
              </p>
              <p className="text-xs leading-relaxed text-[var(--ws-text)] bg-[var(--ws-panel2)]/60 p-3 rounded-xl border border-[var(--ws-border)]">
                {event.description}
              </p>
            </div>
          ) : (
            <p className="text-xs text-[var(--ws-muted)] italic">Chưa có mô tả bổ sung cho mục này.</p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 bg-[var(--ws-panel2)] border-t border-[var(--ws-border)]">
          <a
            href={getGoogleCalendarUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--ws-border)] text-xs font-semibold text-[var(--ws-muted)] hover:text-[var(--ws-text)] hover:bg-[var(--ws-hover)] transition-colors"
          >
            <ExternalLink size={13} /> Thêm vào Google Calendar
          </a>

          <a
            href={event.link}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--ws-accent)] text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-xs"
          >
            {isContest
              ? userRole === 'instructor'
                ? 'Quản lý kỳ thi'
                : 'Vào kỳ thi'
              : userRole === 'instructor'
              ? 'Chi tiết bài tập'
              : 'Làm bài tập'}
          </a>
        </div>
      </div>
    </div>
  );
}
