import { X, Calendar, Clock, BookOpen, Trophy, ExternalLink, GraduationCap } from 'lucide-react';
import { formatVNFull } from '../../utils/dateTime';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  if (!event) return null;

  const isContest = event.type === 'contest';

  // URL tạo sự kiện trên Google Calendar
  const getGoogleCalendarUrl = () => {
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(
      `${event.description || ''}\n\n${t('calendar.classLabel')}: ${event.className || t('calendar.allSchoolEvents')}\n${t('calendar.details')}: ${window.location.origin}${event.link}`
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
      <div className="w-full max-w-lg bg-(--ws-panel) border border-(--ws-border) rounded-2xl shadow-xl overflow-hidden text-(--ws-text)">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-(--ws-border)">
          <div className="flex items-center gap-3">
            <div
              style={{
                backgroundColor: isContest ? 'var(--ws-contest-bg)' : 'var(--ws-hw-bg)',
                color: isContest ? 'var(--ws-contest-text)' : 'var(--ws-hw-text)',
              }}
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
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
                {isContest ? t('calendar.eventContest') : t('calendar.eventHomework')}
              </span>
              <h3 className="text-lg font-bold font-serif text-(--ws-text) mt-1">
                {event.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-(--ws-muted) hover:text-(--ws-text) hover:bg-(--ws-hover) transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-sm">
          {/* Lớp học */}
          {event.className && (
            <div className="flex items-center gap-2.5 text-(--ws-muted)">
              <GraduationCap size={16} className="text-(--ws-accent) shrink-0" />
              <span>
                {t('calendar.classLabel')}: <strong className="text-(--ws-text)">{event.className}</strong>
              </span>
            </div>
          )}

          {/* Thời gian */}
          <div className="p-3.5 rounded-xl bg-(--ws-panel2) border border-(--ws-border) space-y-2">
            <div className="flex items-center gap-2.5 text-(--ws-muted)">
              <Calendar size={15} className="text-(--ws-accent) shrink-0" />
              <span>
                {isContest ? t('calendar.startTime') : t('calendar.deadline')}{' '}
                <strong className="text-(--ws-text)">
                  {formatVNFull(event.startDateTime)} (UTC+7)
                </strong>
              </span>
            </div>
            {isContest && event.endDateTime && (
              <div className="flex items-center gap-2.5 text-(--ws-muted)">
                <Clock size={15} className="text-(--ws-accent) shrink-0" />
                <span>
                  {t('calendar.endTime')}{' '}
                  <strong className="text-(--ws-text)">
                    {formatVNFull(event.endDateTime)} (UTC+7)
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Mô tả */}
          {event.description ? (
            <div>
              <p className="text-xs font-semibold text-(--ws-muted) uppercase tracking-wider mb-1">
                {t('calendar.description')}
              </p>
              <p className="text-xs leading-relaxed text-(--ws-text) bg-(--ws-panel2)/60 p-3 rounded-xl border border-(--ws-border)">
                {event.description}
              </p>
            </div>
          ) : (
            <p className="text-xs text-(--ws-muted) italic">{t('calendar.noDescription')}</p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 bg-(--ws-panel2) border-t border-(--ws-border)">
          <a
            href={getGoogleCalendarUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--ws-border) text-xs font-semibold text-(--ws-muted) hover:text-(--ws-text) hover:bg-(--ws-hover) transition-colors"
          >
            <ExternalLink size={13} /> {t('calendar.addGoogleCalendar')}
          </a>

          <a
            href={event.link}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-(--ws-accent) text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-xs"
          >
            {isContest
              ? userRole === 'instructor'
                ? t('calendar.manageContest')
                : t('calendar.enterContest')
              : userRole === 'instructor'
              ? t('calendar.homeworkDetails')
              : t('calendar.doHomework')}
          </a>
        </div>
      </div>
    </div>
  );
}
