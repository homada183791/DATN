/**
 * Tách thông báo lỗi của trình biên dịch / trình thông dịch thành danh sách lỗi có dòng, cột,
 * giống bảng "Problems" của VS Code. Judge chạy file người dùng nguyên vẹn
 * (main.cpp, main.c, Main.java, main.py, main.go, main.js), nên số dòng khớp với khung code.
 */

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface Diagnostic {
  severity: DiagnosticSeverity;
  /** Dòng, đếm từ 1. */
  line: number;
  /** Cột, đếm từ 1. Không có thì gạch chân cả dòng. */
  column?: number;
  /** Cột kết thúc (không gồm), nếu biết được từ dấu ~~~ hoặc ^^^. */
  endColumn?: number;
  message: string;
  /** Tên file như trình biên dịch in ra, ví dụ main.cpp:61:31. */
  source: string;
}

export interface ParsedCompilerOutput {
  /** Trạng thái đứng đầu, ví dụ COMPILE_ERROR, nếu có tiền tố [..]. */
  status?: string;
  diagnostics: Diagnostic[];
  /** Văn bản gốc, đã bỏ tiền tố trạng thái. */
  raw: string;
}

const FILE = String.raw`(?:[\w./\\-]*?)(?:main|Main)\.(?:cpp|cc|c|java|py|go|js)`;

// gcc/clang/go:  main.cpp:61:31: error: expected ...   |   ./main.go:5:2: undefined: x
const GCC_RE = new RegExp(String.raw`^(${FILE}):(\d+):(\d+):\s*(?:(fatal error|error|warning|note):\s*)?(.*)$`);
// javac: Main.java:5: error: ';' expected
const JAVA_RE = new RegExp(String.raw`^(${FILE}):(\d+):\s*(error|warning):\s*(.*)$`);
// python / node: File "main.py", line 5   |   /sandbox/main.js:5
const PY_FILE_RE = new RegExp(String.raw`^\s*File "(${FILE})", line (\d+)`);
const NODE_FILE_RE = new RegExp(String.raw`^(${FILE}):(\d+)\s*$`);
// dòng ví dụ của gcc: "   61 |   int pos = min(, i + r);"  và dòng dấu "      |      ^~~~"
const GCC_SNIPPET_RE = /^\s*\d*\s*\|/;
const CARET_RE = /^(\s*\|?\s*)([\^~]+)/;
const EXC_RE = /^([A-Za-z_][\w.]*(?:Error|Exception|Warning)|KeyboardInterrupt|SystemExit)\b:?\s*(.*)$/;

function severityOf(word: string | undefined): DiagnosticSeverity {
  if (!word || word === 'error' || word === 'fatal error') return 'error';
  if (word === 'warning') return 'warning';
  return 'info';
}

/**
 * @param code mã nguồn đang mở (nếu có). Traceback python bỏ khoảng trắng đầu dòng khi in,
 * nên cần mã gốc để cộng lại phần thụt dòng cho đúng cột.
 */
export function parseCompilerOutput(text: string, code?: string): ParsedCompilerOutput {
  const sourceLines = code?.replace(/\r\n/g, '\n').split('\n');
  let raw = text.replace(/\r\n/g, '\n');
  let status: string | undefined;
  const m = /^\[([A-Z_]+)\]\s*/.exec(raw);
  if (m) {
    status = m[1];
    raw = raw.slice(m[0].length);
  }

  const lines = raw.split('\n');
  const diagnostics: Diagnostic[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const g = GCC_RE.exec(line);
    if (g) {
      const d: Diagnostic = {
        severity: severityOf(g[4]),
        line: Number(g[2]),
        column: Number(g[3]),
        message: g[5].trim(),
        source: `${g[1].replace(/^.*[\\/]/, '')}:${g[2]}:${g[3]}`,
      };
      // gcc in kèm dòng ví dụ và dấu ^~~~ ngay sau; dùng độ dài dấu để biết đoạn cần gạch chân.
      if (GCC_SNIPPET_RE.test(lines[i + 1] ?? '') && GCC_SNIPPET_RE.test(lines[i + 2] ?? '')) {
        const caret = CARET_RE.exec((lines[i + 2] ?? '').replace(/^\s*\|/, ''));
        if (caret && caret[2].length > 1) d.endColumn = (d.column ?? 1) + caret[2].length;
      }
      diagnostics.push(d);
      continue;
    }

    const j = JAVA_RE.exec(line);
    if (j) {
      const d: Diagnostic = {
        severity: severityOf(j[3]),
        line: Number(j[2]),
        message: j[4].trim(),
        source: `${j[1].replace(/^.*[\\/]/, '')}:${j[2]}`,
      };
      // javac in dòng code rồi một dòng chỉ có dấu ^ đúng cột lỗi.
      const caretLine = lines[i + 2] ?? '';
      const idx = caretLine.indexOf('^');
      if (idx >= 0 && caretLine.trim() === '^') d.column = idx + 1;
      diagnostics.push(d);
      continue;
    }

    const p = PY_FILE_RE.exec(line) ?? NODE_FILE_RE.exec(line);
    if (p) {
      // Lỗi kiểu traceback: khung cuối cùng trong file của người dùng + dòng ngoại lệ ở cuối.
      const lineNo = Number(p[2]);
      let column: number | undefined;
      let endColumn: number | undefined;
      // tìm dòng dấu ^ (có thể kèm ~) ngay sau (python ≥ 3.10 / node)
      for (let k = i + 1; k <= i + 3 && k < lines.length; k++) {
        const c = /^(\s*)([~^]*\^[~^]*)\s*$/.exec(lines[k]);
        if (c) {
          const codeLine = lines[k - 1] ?? '';
          // python in dòng ví dụ đã bỏ thụt dòng gốc rồi thêm 4 dấu cách; đổi về cột trong mã gốc
          const shownIndent = codeLine.length - codeLine.trimStart().length;
          const orig = sourceLines?.[lineNo - 1] ?? '';
          const origIndent = orig.length - orig.trimStart().length;
          column = Math.max(1, c[1].length - shownIndent + origIndent + 1);
          if (c[2].length > 1) endColumn = column + c[2].length;
          break;
        }
      }
      let message = '';
      for (let k = lines.length - 1; k > i; k--) {
        const e = EXC_RE.exec(lines[k].trim());
        if (e) {
          message = e[2] ? `${e[1]}: ${e[2]}` : e[1];
          break;
        }
      }
      const d: Diagnostic = {
        severity: 'error',
        line: lineNo,
        column,
        endColumn,
        message: message || 'Runtime error',
        source: `${p[1].replace(/^.*[\\/]/, '')}:${lineNo}`,
      };
      // Traceback có nhiều khung: chỉ giữ khung cuối (gần lỗi nhất).
      const prev = diagnostics[diagnostics.length - 1];
      if (prev && prev.message === d.message && prev.source.split(':')[0] === d.source.split(':')[0]) {
        diagnostics[diagnostics.length - 1] = d;
      } else {
        diagnostics.push(d);
      }
    }
  }

  return { status, diagnostics, raw };
}
