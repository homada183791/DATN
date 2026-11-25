/**
 * Đọc file .csv danh sách lớp: chỉ quan tâm cột MSSV, bỏ qua mọi cột khác.
 * - Tự nhận dấu phân cách `,` `;` hoặc tab, hỗ trợ ô đặt trong dấu ngoặc kép và BOM.
 * - Tìm hàng tiêu đề (trong 20 hàng đầu) có cột tên "MSSV" / "Mã số sinh viên" / "Student ID"...
 */

const MSSV_HEADERS = new Set([
  'mssv',
  'masosinhvien',
  'masv',
  'sinhvienid',
  'studentid',
  'studentcode',
  'studentnumber',
]);

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function detectDelimiter(text: string): string {
  const firstLines = text.split(/\r?\n/).slice(0, 5).join('\n');
  const counts: Record<string, number> = {
    ',': (firstLines.match(/,/g) || []).length,
    ';': (firstLines.match(/;/g) || []).length,
    '\t': (firstLines.match(/\t/g) || []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export interface RosterParseResult {
  /** Danh sách MSSV hợp lệ (8 chữ số), đã loại trùng */
  codes: string[];
  /** Số ô ở cột MSSV không hợp lệ (không đủ 8 chữ số) */
  invalidCount: number;
}

export class RosterCsvError extends Error {}

export function parseRosterCsv(raw: string): RosterParseResult {
  const text = raw.replace(/^﻿/, '');
  const rows = parseRows(text, detectDelimiter(text));

  let headerRow = -1;
  let column = -1;
  for (let r = 0; r < Math.min(rows.length, 20) && headerRow < 0; r++) {
    const idx = rows[r].findIndex((cell) => MSSV_HEADERS.has(normalizeHeader(cell)));
    if (idx >= 0) {
      headerRow = r;
      column = idx;
    }
  }
  if (headerRow < 0) {
    throw new RosterCsvError('NO_COLUMN');
  }

  const codes = new Set<string>();
  let invalidCount = 0;
  for (let r = headerRow + 1; r < rows.length; r++) {
    const value = (rows[r][column] ?? '').trim();
    if (!value) continue;
    if (/^\d{8}$/.test(value)) codes.add(value);
    else invalidCount++;
  }
  if (codes.size === 0) {
    throw new RosterCsvError('NO_VALID');
  }
  return { codes: [...codes], invalidCount };
}