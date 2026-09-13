/**
 * Timezone utility — khóa cứng UTC+7 (Ho Chi Minh City, VN)
 *
 * Tất cả mọi hiển thị ngày giờ trong app đều qua đây,
 * tránh việc Date tự convert sang local timezone của máy.
 */

const VN_TZ = 'Asia/Ho_Chi_Minh'; // UTC+7

/** Parse bất kỳ chuỗi ISO / datetime-local về Date object */
export function parseDate(value: string): Date {
  // datetime-local format: "2026-10-12T08:00" — không có timezone suffix
  // → cần coi là UTC+7, convert sang UTC trước khi dùng
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    // Thêm offset +07:00 rồi parse
    return new Date(`${value}:00+07:00`);
  }
  return new Date(value);
}

/**
 * Format một Date (hoặc chuỗi ISO) sang dạng đọc được theo UTC+7.
 * VD: "13/10/2026 10:33" hoặc "13/10/2026"
 */
export function formatVN(
  value: string | Date,
  opts: { time?: boolean } = { time: true },
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return '—';

  const timeOpts: Intl.DateTimeFormatOptions = {
    timeZone: VN_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(opts.time ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  };
  return new Intl.DateTimeFormat('vi-VN', timeOpts).format(date);
}

/**
 * Chuyển một Date (hoặc chuỗi ISO từ BE) sang giá trị cho input[type=datetime-local]
 * VD: "2026-10-12T08:00"  (theo UTC+7)
 */
export function toDatetimeLocal(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return '';

  // Dùng Intl để lấy các phần ngày/giờ theo UTC+7
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: VN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/**
 * Chuyển giá trị từ input[type=datetime-local] (coi là UTC+7) sang ISO string (UTC).
 * Đây là giá trị gửi lên BE.
 */
export function datetimeLocalToISO(localValue: string): string {
  if (!localValue) return '';
  return parseDate(localValue).toISOString();
}
