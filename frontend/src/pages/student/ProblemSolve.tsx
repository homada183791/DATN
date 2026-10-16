import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDetail, LANG_LABELS, Lang, ProblemDetail } from '../../data/problemDetails';
import { ApiError, apiFetch } from '../../api/http';
import { useProblemQuery } from '../../api/problems';
import { useProblemSubmissionsQuery, type SubmissionDto } from '../../api/submissions';
import { formatVNFull } from '../../utils/dateTime';
import { joinContest, fetchContestDetail } from '../../api/contests';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { type Socket } from 'socket.io-client';
import { createSocket } from '../../api/socket';
import {
  HelpCircle,
  Send,
  Columns,
  FileText,
  Code,
  Download,
  Play,
  Copy,
  RotateCcw,
  ClipboardPaste,
  RefreshCw,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Bug,
  FlaskConical,
  Loader2,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Languages,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

/* ---------------- syntax highlighting ---------------- */

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlight(code: string, lang: Lang): string {
  const esc = escapeHtml(code);
  let regex: RegExp;
  if (lang === 'python') {
    regex =
      /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b(\d+(?:\.\d+)?)\b|\b(def|return|if|elif|else|for|while|in|not|and|or|break|continue|import|from|as|class|lambda|pass|with|try|except|finally|True|False|None|print|range|len|input|map|int|str|list|sorted|sum|abs)\b/g;
  } else if (lang === 'java') {
    regex =
      /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b(\d+(?:\.\d+)?[Ll]?)\b|\b(public|private|protected|static|final|class|interface|void|int|long|double|float|char|boolean|byte|short|return|if|else|for|while|do|break|continue|new|import|package|try|catch|finally|throw|throws|this|null|true|false)\b|\b([A-Z][A-Za-z0-9_]*)\b|(\w+)(?=\s*\()/g;
  } else {
    regex =
      /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(^[ \t]*#[^\n]*)|\b(\d+(?:\.\d+)?[Ll]?)\b|\b(using|namespace|int|long|long long|double|float|char|void|bool|return|if|else|for|while|do|break|continue|struct|class|const|auto|true|false|nullptr|new|delete|public|private|static|sizeof|typedef)\b|\b(vector|string|cin|cout|endl|cerr|map|set|pair|queue|stack|priority_queue|array)\b|(\w+)(?=\s*\()/gm;
  }

  return esc.replace(regex, (m, com, str, g3, g4, g5, g6, g7) => {
    if (com) return `<span class="tok-com">${com}</span>`;
    if (str) return `<span class="tok-str">${str}</span>`;
    if (lang === 'python') {
      if (g3) return `<span class="tok-num">${g3}</span>`;
      if (g4) return `<span class="tok-kw">${g4}</span>`;
      return m;
    }
    if (lang === 'java') {
      if (g3) return `<span class="tok-num">${g3}</span>`;
      if (g4) return `<span class="tok-kw">${g4}</span>`;
      if (g5) return `<span class="tok-ty">${g5}</span>`;
      if (g6) return `<span class="tok-fn">${g6}</span>`;
      return m;
    }
    // C++: g3 preprocessor, g4 number, g5 keyword, g6 type, g7 function
    if (g3) return `<span class="tok-pp">${g3}</span>`;
    if (g4) return `<span class="tok-num">${g4}</span>`;
    if (g5) return `<span class="tok-kw">${g5}</span>`;
    if (g6) return `<span class="tok-ty">${g6}</span>`;
    if (g7) return `<span class="tok-fn">${g7}</span>`;
    return m;
  });
}

/* ---------------- markdown (problem statement) styling ---------------- */

const markdownComponents: Components = {
  h1: ({ children }) => <h2 className="mt-5 mb-3 text-[21px] font-extrabold text-(--ws-text)">{children}</h2>,
  h2: ({ children }) => <h3 className="mt-5 mb-2.5 text-[18px] font-bold text-(--ws-text)">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-4 mb-2 text-[15.5px] font-bold text-(--ws-text)">{children}</h4>,
  h4: ({ children }) => <h5 className="mt-3 mb-2 text-[14.5px] font-bold text-(--ws-text)">{children}</h5>,
  p: ({ children }) => <p className="text-[14.5px] leading-7 text-(--ws-text)/90 mb-3">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-(--ws-text)">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-(--ws-accent) underline underline-offset-2 hover:no-underline">
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="space-y-1.5 ml-1 mb-3">{children}</ul>,
  ol: ({ children }) => <ol className="space-y-1.5 ml-5 mb-3 list-decimal text-[14.5px] leading-7 text-(--ws-text)/90">{children}</ol>,
  li: ({ children, ...props }) => {
    const ordered = (props as { ordered?: boolean }).ordered;
    if (ordered) return <li className="pl-1">{children}</li>;
    return (
      <li className="flex gap-2.5 text-[14.5px] leading-7 text-(--ws-text)/90">
        <span className="mt-[11px] w-1.5 h-1.5 rounded-full bg-(--ws-accent) shrink-0" />
        <span>{children}</span>
      </li>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="my-3 rounded-r-lg border-l-4 border-(--ws-accent) bg-(--ws-panel2)/60 py-2.5 px-4 text-[14px] leading-7 text-(--ws-text)/90 [&_p]:mb-1.5 [&_p:last-child]:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-5 border-(--ws-border)" />,
  img: ({ src, alt }) => <img src={src} alt={alt} className="my-3 max-w-full rounded-lg border border-(--ws-border)" />,
  code: ({ children, node: _node, ...props }) => (
    <code className="px-1.5 py-0.5 rounded bg-(--ws-panel2) font-mono text-[13px] text-(--ws-accent) whitespace-pre-wrap wrap-anywhere [box-decoration-break:clone]" {...props}>
      {children}
    </code>
  ),
  pre: ({ children, node: _node, ...props }) => (
    <pre
      className="my-3 rounded-xl border border-(--ws-border) bg-(--ws-editor) p-4 overflow-x-auto font-mono text-[13px] leading-6 text-(--ws-text) [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit [&_code]:rounded-none [&_code]:whitespace-pre [&_code]:wrap-normal"
      {...props}
    >
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-hidden rounded-lg border border-(--ws-border)">
      <table className="w-full text-[13.5px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-(--ws-panel2)">{children}</thead>,
  th: ({ children }) => <th className="text-left px-4 py-2.5 font-bold text-(--ws-text)">{children}</th>,
  td: ({ children }) => <td className="px-4 py-2.5 border-t border-(--ws-border) text-(--ws-text)/90">{children}</td>,
};

// Nhiều đề bài được dán nguyên văn từ LeetCode (hoặc gõ tay theo cùng bố cục)
// dưới dạng text thuần, không có cú pháp markdown: "Example 1:" + các dòng
// "Input: ...", "Output: ...", "Explanation: ...", và "Constraints:" + danh
// sách điều kiện bên dưới. Hàm này nhận diện các khối đó và chuyển thành
// markdown chuẩn (tiêu đề in đậm, blockquote/list, code inline cho giá trị)
// để hiển thị đẹp như trên LeetCode, mà không đụng tới nội dung đã có sẵn
// cú pháp markdown riêng.
const SECTION_HEADER_RE = /^\s*(?:\*\*)?(?:Example|Ví dụ)\s+\d+\s*:?\s*(?:\*\*)?\s*$|^\s*(?:\*\*)?(?:Constraints|Ràng buộc)\s*:?\s*(?:\*\*)?\s*$/i;
const FIELD_LABEL_RE = /^\s*(?:\*\*)?(Input|Output|Explanation|Đầu vào|Đầu ra|Giải thích)(?:\*\*)?\s*:\s*(.*)$/i;

// các dòng đã là cú pháp markdown chủ đích (heading, list, blockquote, bảng,
// code fence, hr...) thì giữ nguyên, không gộp vào đoạn văn / không tô code
const MARKDOWN_STRUCTURAL_RE = /^\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|\|.*\||```|~~~|-{3,}\s*$|={3,}\s*$)/;

// những từ nối câu phổ biến — nếu một "mảnh" bị ngắt dòng có chứa các từ này
// thì đó là văn bản thường (được bọc trong thẻ in nghiêng/nhấn mạnh ở bản gốc),
// không phải tên biến/biểu thức code, nên không tô nền code cho nó.
const PROSE_STOPWORDS_RE =
  /\b(a|an|the|of|and|or|is|are|was|were|be|to|in|on|at|for|with|by|from|that|this|these|those|you|your|we|our|it|its|as|if|then|else|return|given|find|each|all|any|such|which|who|whom|where|when|why|how|but|not|no|yes|can|could|should|would|will|shall|may|might|must|do|does|did|has|have|had|into|onto|than|also|only|both|either|neither|more|most|least|same|other|another|some|many|much|few|several|first|second|third|last|new|old|valid|invalid|possible|impossible|exactly|approximately|respectively|consisting|consists|consist|contain|contains|containing|represents?|represent|denotes?|denote|means?|mean|called|named|described|defined|following|above|below|output|answer|result|value|values|array|arrays|string|strings|integer|integers|number|numbers|element|elements|index|indices|length|size|case|cases|example|examples|input|inputs|note|notes)\b/i;

// nhận diện 1 "mảnh" trông giống tên biến/biểu thức/code (bị bọc trong thẻ
// <code> ở bản gốc rồi xuống dòng khi được bóc tách thành text thuần) để tô
// thành code inline, giống cách LeetCode in đậm các biến trong đoạn mô tả.
function looksLikeCodeToken(segment: string): boolean {
  const s = segment.trim();
  if (!s || PROSE_STOPWORDS_RE.test(s)) return false;
  // 1 từ tiếng Anh thuần, khá dài → nhiều khả năng là chữ nhấn mạnh, không phải code
  if (/^[A-Za-z]+$/.test(s) && s.length > 12) return false;
  // định danh thuần (biến/hàm): chữ/số/gạch dưới, không khoảng trắng
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)) return true;
  // số nguyên/thập phân (kể cả âm)
  if (/^-?\d+(\.\d+)?$/.test(s)) return true;
  // 1 token liền (không khoảng trắng) có ký tự đặc trưng của code: nums1[i], Node.val, a-b...
  // (bỏ dấu câu cuối câu trước khi xét, để "table." không bị coi là code)
  const core = s.replace(/[.,;:!?]+$/, '');
  if (!/\s/.test(core) && /[.\-_[\]()]/.test(core) && /[A-Za-z0-9]/.test(core)) return true;
  // biểu thức toán/so sánh có thể có khoảng trắng bên trong dấu ngoặc: O(log (m+n)), 1 <= n <= 100
  if (/^[\w\s()[\]{}.,+\-*/^<>=:'"|]+$/.test(s) && /[\d()[\]{}^_<>=]/.test(s)) return true;
  return false;
}

// Bảng dạng ASCII (đề SQL: "+----+----+", "| id | name |") bị CommonMark gộp
// thành 1 đoạn văn nếu để nguyên → bọc các dòng bảng liên tiếp vào code fence để
// giữ nguyên căn lề cột, hiển thị bằng font monospace và cuộn ngang khi quá rộng.
const ASCII_TABLE_LINE_RE = /^\s*(\+[-=+]*\+|\|.*\|)\s*$/;
function fenceAsciiTables(src: string[]): string[] {
  const res: string[] = [];
  let inFence: boolean = false;
  let i = 0;
  while (i < src.length) {
    if (/^\s*```/.test(src[i])) {
      // fence có sẵn do người soạn viết: không đụng vào
      const isClosing: boolean = inFence && /^\s*```\s*$/.test(src[i]);
      inFence = !isClosing;
      res.push(src[i]);
      i++;
      continue;
    }
    if (!inFence && ASCII_TABLE_LINE_RE.test(src[i])) {
      let j = i;
      while (j < src.length && ASCII_TABLE_LINE_RE.test(src[j])) j++;
      if (j - i >= 2) {
        res.push('```', ...src.slice(i, j).map((l) => l.trimEnd()), '```');
        i = j;
        continue;
      }
    }
    res.push(src[i]);
    i++;
  }
  return res;
}

// Bản gốc (LeetCode) có danh sách <ul>/<li> nhưng khi bóc thành text thì mất dấu
// đầu dòng: mỗi mục chỉ còn là 1 đoạn riêng, còn danh sách lồng nhau để lại 1 dòng
// chỉ có ký tự TAB. Hàm này đoán lại cấu trúc danh sách ở phần mô tả phía trên
// Example và đánh dấu dòng đầu mỗi mục bằng ký tự điều khiển (LIST_TOP / LIST_SUB),
// để formatLeetCodeStyleExamples xuất ra "- mục" / "  - mục lồng".
const LIST_TOP = '\u0001';
const LIST_SUB = '\u0002';
const TAB_ONLY_RE = /^[\t ]*\t[\t ]*$/;
const LIST_CLOSING_RE =
  /^(?:Given|Return|Implement|Write|Find|Note|Notes|Follow|You (?:must|are given|need|have|will)|Bạn (?:phải|được cho|cần)|Cho|Trả về|Hãy)\b/;
function markIntroLists(src: string[]): string[] {
  type Para = { start: number; end: number; text: string; tabAfter: boolean };
  const paras: Para[] = [];
  let cur: Para | null = null;
  let stop = src.length;
  for (let i = 0; i < src.length; i++) {
    const l = src[i];
    if (/^\s*(?:\*\*)?(?:Example|Ví dụ)\s+\d+|^\s*(?:\*\*)?(?:Constraints|Ràng buộc)\s*:?\s*(?:\*\*)?\s*$/i.test(l) || /^\s*```/.test(l)) {
      stop = i;
      break;
    }
    if (TAB_ONLY_RE.test(l)) {
      if (cur) {
        cur.tabAfter = true;
        paras.push(cur);
        cur = null;
      } else if (paras.length > 0) {
        paras[paras.length - 1].tabAfter = true;
      }
      continue;
    }
    if (l.trim() === '') {
      if (cur) {
        paras.push(cur);
        cur = null;
      }
      continue;
    }
    if (!cur) cur = { start: i, end: i, text: l.trim(), tabAfter: false };
    else {
      cur.end = i;
      cur.text += ` ${l.trim()}`;
    }
  }
  if (cur) paras.push(cur);
  if (paras.length === 0) return src;

  const level: number[] = new Array(paras.length).fill(0);
  const structural = (t: string) => MARKDOWN_STRUCTURAL_RE.test(t);
  let i = 0;
  while (i < paras.length) {
    if (!paras[i].tabAfter || level[i] !== 0 || structural(paras[i].text)) {
      i++;
      continue;
    }
    // lùi lại lấy các mục anh em ngắn đứng ngay trước (dừng ở câu dẫn kết thúc bằng ":")
    let s = i;
    let steps = 0;
    while (s > 0 && steps < 6) {
      const prev = paras[s - 1].text;
      if (/[:：]\s*$/.test(prev) || prev.length > 150 || structural(prev) || level[s - 1] !== 0) break;
      s--;
      steps++;
    }
    // tiến tới khi gặp đoạn kết ("Given ...", "Return ...") hoặc hết phần mô tả
    let e = i + 1;
    while (e < paras.length && !LIST_CLOSING_RE.test(paras[e].text) && !structural(paras[e].text)) e++;
    // phần sau mỗi dấu TAB là mục lồng; nếu mục đó mở đầu bằng "For example" thì chỉ lồng 1 mục
    let nested = false;
    let nestedLeft = 0;
    for (let k = s; k < e; k++) {
      if (nested && paras[k].tabAfter) nested = false; // mục này tự là cha của 1 danh sách lồng mới
      if (nestedLeft > 0) {
        level[k] = 2;
        nestedLeft--;
        if (nestedLeft === 0) nested = false;
      } else {
        level[k] = nested ? 2 : 1;
      }
      if (paras[k].tabAfter && k + 1 < e) {
        if (/^(?:For example|e\.g\.|i\.e\.|Ví dụ)/i.test(paras[k + 1].text)) nestedLeft = 1;
        else nested = true;
      }
    }
    i = e;
  }

  const out = src.slice();
  paras.forEach((pp, idx) => {
    if (level[idx] === 0 || pp.start >= stop) return;
    out[pp.start] = (level[idx] === 1 ? LIST_TOP : LIST_SUB) + out[pp.start];
  });
  return out;
}

function formatLeetCodeStyleExamples(text: string): string {
  const lines = markIntroLists(fenceAsciiTables(text.split('\n')));
  const out: string[] = [];
  // 'none' = văn bản thường, 'example' = trong khối Example (blockquote),
  // 'constraints' = trong khối Constraints (danh sách)
  let mode: 'none' | 'example' | 'constraints' = 'none';
  let constraintItemAdded = false;
  let constraintsBlankRun = 0;

  // mỗi điều kiện trong Constraints cũng có thể bị bóc tách HTML làm rớt
  // xuống nhiều dòng (phổ biến nhất: số mũ dạng "10^6" bị tách thành dòng
  // "10" rồi dòng "6" riêng do thẻ <sup> gốc) — gom các dòng liên tiếp
  // (không có dòng trống xen giữa) thành 1 điều kiện duy nhất thay vì mỗi
  // dòng con lại thành 1 gạch đầu dòng riêng biệt.
  let constraintBuffer: string[] = [];
  const flushConstraint = () => {
    if (constraintBuffer.length === 0) return;
    let merged = constraintBuffer[0];
    for (let k = 1; k < constraintBuffer.length; k++) {
      const part = constraintBuffer[k];
      // mảnh hiện tại chỉ là số thuần, nối tiếp ngay sau 1 số khác => đó là
      // số mũ bị tách dòng (vd. "10" + "6" => "10^6"), nối bằng dấu "^" và
      // không có khoảng trắng; các trường hợp còn lại nối bằng dấu cách.
      if (/\d$/.test(merged) && /^\d+$/.test(part)) {
        merged += `^${part}`;
      } else {
        merged += ` ${part}`;
      }
    }
    merged = merged.replace(/\s+([.,;:!?])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim();
    out.push(`- \`${merged.replace(/`/g, "'")}\``);
    constraintBuffer = [];
  };

  // văn bản thường (phần nội dung chính phía trên "Example") thường bị ngắt
  // dòng rải rác ở bản gốc (mỗi biến/code nằm riêng 1 dòng do bóc tách từ thẻ
  // <code>) — gom các dòng liên tiếp (không trống) lại thành 1 đoạn liền mạch,
  // đồng thời tô code inline cho các mảnh trông giống biến/biểu thức.
  let paragraphBuffer: string[] = [];
  let listPrefix = '';
  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    const merged = paragraphBuffer
      .join(' ')
      .replace(/\s+([.,;:!?])/g, '$1')
      .replace(/[ \t]{2,}/g, ' ')
      .trim()
      // đề SQL: "id is the primary key...", "departmentId is a foreign key..." — tên
      // cột đứng đầu câu nằm cùng dòng (không bị ngắt dòng) nên cũng cần tô code
      .replace(
        /(^|[.!?]\s+)(\([A-Za-z_]\w*(?:, [A-Za-z_]\w*)*\)|[A-Za-z_]\w*(?:, [A-Za-z_]\w*)*(?: and [A-Za-z_]\w*)?)(?= (?:is|are) (?:the |a |an )?(?:primary|foreign|unique)\b)/g,
        '$1`$2`',
      );
    if (merged) out.push(listPrefix + merged);
    listPrefix = '';
    paragraphBuffer = [];
  };

  // hỗ trợ cả tiêu đề tiếng Anh (Example/Constraints/Input/Output/Explanation)
  // lẫn tiếng Việt (Ví dụ/Ràng buộc/Đầu vào/Đầu ra/Giải thích), vì đề bài có
  // thể được hiển thị ở 1 trong 2 ngôn ngữ tuỳ lựa chọn của người dùng.
  for (let idx = 0; idx < lines.length; idx++) {
    let line = lines[idx];
    // dấu hiệu mục danh sách do markIntroLists gắn vào đầu dòng
    let itemLevel = 0;
    if (line.startsWith(LIST_TOP) || line.startsWith(LIST_SUB)) {
      itemLevel = line.startsWith(LIST_TOP) ? 1 : 2;
      line = line.slice(1);
    }

    // code block / bảng ASCII đã bọc fence: giữ nguyên từng dòng, không gộp
    if (/^\s*```/.test(line)) {
      const fenceLines: string[] = [];
      let k = idx + 1;
      while (k < lines.length && !/^\s*```\s*$/.test(lines[k])) {
        fenceLines.push(lines[k]);
        k++;
      }
      flushParagraph();
      flushConstraint();
      if (mode === 'constraints') mode = 'none';
      const prefix = mode === 'example' ? '> ' : '';
      if (!prefix && out.length > 0 && out[out.length - 1] !== '') out.push('');
      out.push(`${prefix}${line.trim()}`, ...fenceLines.map((l) => prefix + l), `${prefix}\`\`\``);
      if (!prefix) out.push('');
      idx = k;
      continue;
    }

    const exampleMatch =line.match(/^\s*(?:\*\*)?(?:Example|Ví dụ)\s+(\d+)\s*:?\s*(?:\*\*)?\s*$/i);
    if (exampleMatch) {
      flushParagraph();
      flushConstraint();
      out.push(`**${/ví/i.test(line) ? 'Ví dụ' : 'Example'} ${exampleMatch[1]}:**`);
      mode = 'example';
      continue;
    }

    const constraintsMatch = line.match(/^\s*(?:\*\*)?(?:Constraints|Ràng buộc)\s*:?\s*(?:\*\*)?\s*$/i);
    if (constraintsMatch) {
      flushParagraph();
      flushConstraint();
      out.push(`**${/ràng/i.test(line) ? 'Ràng buộc' : 'Constraints'}:**`);
      mode = 'constraints';
      constraintItemAdded = false;
      constraintsBlankRun = 0;
      continue;
    }

    const fieldMatch = line.match(FIELD_LABEL_RE);
    if (fieldMatch) {
      flushParagraph();
      flushConstraint();
      const rawLabel = fieldMatch[1];
      const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1).toLowerCase();
      const normalized = rawLabel.toLowerCase();
      const isExplanation = normalized === 'explanation' || normalized === 'giải thích';
      let rawValue = fieldMatch[2].trim();

      // một số đề (vd. xuất từ LeetCode) để giá trị xuống (các) dòng kế tiếp
      // thay vì ngay sau dấu ":" — gom các dòng đó lại cho tới khi gặp dòng
      // trống hoặc một tiêu đề/field khác
      type FieldChunk = { kind: 'text'; text: string } | { kind: 'fence'; open: string; lines: string[] };
      let fieldChunks: FieldChunk[] | null = null;
      if (!rawValue) {
        let j = idx + 1;
        // bỏ qua dòng trống ngay sau nhãn (vd. "Input:\n \nEmployee table:...")
        while (j < lines.length && lines[j].trim() === '') j++;
        const chunks: FieldChunk[] = [];
        while (
          j < lines.length &&
          lines[j].trim() !== '' &&
          !SECTION_HEADER_RE.test(lines[j]) &&
          !FIELD_LABEL_RE.test(lines[j])
        ) {
          if (/^\s*```/.test(lines[j])) {
            // bảng ASCII (đã được bọc fence ở bước tiền xử lý) nằm trong giá trị field
            const open = lines[j].trim();
            const fenceLines: string[] = [];
            j++;
            while (j < lines.length && !/^\s*```\s*$/.test(lines[j])) {
              fenceLines.push(lines[j]);
              j++;
            }
            j++; // bỏ dòng đóng fence
            chunks.push({ kind: 'fence', open, lines: fenceLines });
          } else {
            const last = chunks[chunks.length - 1];
            if (last && last.kind === 'text') last.text += ` ${lines[j].trim()}`;
            else chunks.push({ kind: 'text', text: lines[j].trim() });
            j++;
          }
        }
        if (chunks.length > 0) {
          idx = j - 1;
          if (chunks.length === 1 && chunks[0].kind === 'text') rawValue = chunks[0].text;
          else fieldChunks = chunks;
        }
      }

      if (fieldChunks) {
        // giá trị gồm bảng ASCII: hiển thị chữ mô tả + bảng (code block) trong cùng khung
        out.push(`> **${label}:**`);
        for (const c of fieldChunks) {
          out.push('>');
          if (c.kind === 'text') {
            out.push(`> ${isExplanation ? c.text.replace(/"([^"]*)"/g, '`"$1"`') : c.text}`);
          } else {
            out.push(`> ${c.open}`, ...c.lines.map((l) => `> ${l}`), '> ```');
          }
        }
        mode = 'example';
        continue;
      }

      const value = isExplanation
        ? rawValue.replace(/"([^"]*)"/g, '`"$1"`')
        : rawValue
          ? `\`${rawValue.replace(/`/g, "'")}\``
          : '';
      out.push(`> **${label}:** ${value}`);
      mode = 'example';
      continue;
    }

    const trimmed = line.trim();

    if (mode === 'constraints') {
      if (trimmed === '') {
        constraintsBlankRun++;
        // 1 dòng trống = kết thúc điều kiện hiện tại (gộp các dòng con vừa
        // gom được thành 1 gạch đầu dòng); 2 dòng trống liên tiếp trở lên mới
        // thực sự thoát khỏi khối Constraints (khớp với dữ liệu thực tế, nơi
        // phần sau Constraints — nếu có — luôn cách ra bằng nhiều hơn 1 dòng
        // trống, còn giữa 2 điều kiện chỉ cách đúng 1 dòng trống)
        flushConstraint();
        if (constraintItemAdded && constraintsBlankRun >= 2) mode = 'none';
      } else {
        constraintsBlankRun = 0;
        // bỏ dấu đầu dòng có sẵn (-, *, •, 1.) nếu người soạn đã gõ sẵn bullet —
        // yêu cầu có khoảng trắng theo sau để không cắt nhầm dấu "-" trong biểu
        // thức như "-2^31 <= target <= 2^31"
        const bulletContent = trimmed.replace(/^(?:[-*•]|\d+[.)])\s+/, '');
        constraintBuffer.push(bulletContent);
        constraintItemAdded = true;
      }
      continue;
    }

    if (mode === 'example') {
      if (trimmed === '') {
        mode = 'none';
      } else {
        // dòng tiếp nối (vd. giải thích dài xuống dòng) vẫn giữ trong cùng khối blockquote
        out.push(`> ${trimmed}`);
        continue;
      }
    }

    // mode === 'none': văn bản thường phía trên khối Example đầu tiên (hoặc
    // giữa 2 khối) — gom thành đoạn văn liền mạch, tô code cho các mảnh giống
    // biến/biểu thức, giữ nguyên các dòng đã là cú pháp markdown chủ đích.
    if (trimmed === '') {
      flushParagraph();
      if (out.length > 0 && out[out.length - 1] !== '') {
        // giữa 2 mục danh sách liên tiếp không chèn dòng trống (giữ danh sách "chặt")
        let nx = idx + 1;
        while (nx < lines.length && lines[nx].trim() === '') nx++;
        const nextIsItem = nx < lines.length && (lines[nx].startsWith(LIST_TOP) || lines[nx].startsWith(LIST_SUB));
        if (!(nextIsItem && /^\s*- /.test(out[out.length - 1]))) out.push('');
      }
      continue;
    }

    if (MARKDOWN_STRUCTURAL_RE.test(line)) {
      flushParagraph();
      out.push(line);
      continue;
    }

    // nhãn phần phụ như "Follow-up:" / "Note:" → in đậm (không phải code) và mở
    // đầu 1 đoạn mới, nội dung theo sau nối liền ngay sau nhãn
    const noteLabel = trimmed.match(/^(?:\*\*)?(Follow[- ]?up|Note|Notes|Hint)\s*:\s*(?:\*\*)?$/i);
    if (noteLabel) {
      flushParagraph();
      paragraphBuffer.push(`**${noteLabel[1]}:**`);
      continue;
    }

    if (itemLevel > 0) {
      flushParagraph();
      listPrefix = itemLevel === 1 ? '- ' : '  - ';
    }
    paragraphBuffer.push(looksLikeCodeToken(trimmed) ? `\`${trimmed.replace(/`/g, "'")}\`` : trimmed);
  }
  flushParagraph();
  flushConstraint();

  return out.join('\n');
}

// Đề bài có thể được nhập theo dạng song ngữ trong cùng một trường "description":
//   [Tiếng Việt]
//   ...nội dung tiếng Việt...
//   ----------
//   [English]
//   ...nội dung tiếng Anh...
// Hàm này tách nội dung thành 2 phần riêng để hiển thị theo ngôn ngữ người dùng chọn.
// Nếu không khớp định dạng song ngữ (đề chỉ có 1 ngôn ngữ), trả về null — khi đó
// UI sẽ hiển thị nguyên văn toàn bộ nội dung như cũ, không có nút chuyển đổi.
function splitBilingualDescription(text: string): { vi: string; en: string } | null {
  const match = text.match(
    /\[\s*Tiếng\s*Việt\s*\]\s*\n([\s\S]*?)\n-{3,}\s*\n\s*\[\s*English\s*\]\s*\n([\s\S]*)$/i,
  );
  if (!match) return null;
  return { vi: match[1].trim(), en: match[2].trim() };
}

// Làm gọn dữ liệu test mẫu: thống nhất xuống dòng, bỏ khoảng trắng thừa cuối
// mỗi dòng (kể cả NBSP) và dòng trống đầu/cuối — giữ nguyên khoảng trắng đầu
// dòng để bảng ASCII (đề SQL) vẫn thẳng cột.
function tidySampleText(s: string): string {
  return s
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/[ \t ]+$/, ''))
    .join('\n')
    .replace(/^\n+|\n+$/g, '');
}

// Test case của đề SQL được lưu dưới dạng JSON {"headers": {...}, "rows": {...}}.
// Chuyển thành bảng ASCII giống phần ví dụ trong đề để dễ đọc. Chỉ dùng để HIỂN
// THỊ — dữ liệu gốc (JSON) vẫn là thứ được gửi đi khi chạy. Trả về null nếu
// input không đúng định dạng này.
function sqlJsonToTables(raw: string): string | null {
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const { headers, rows } = obj as { headers?: unknown; rows?: unknown };
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return null;
  if (!rows || typeof rows !== 'object' || Array.isArray(rows)) return null;

  const fmt = (v: unknown): string => {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };

  const blocks: string[] = [];
  for (const [name, cols] of Object.entries(headers as Record<string, unknown>)) {
    if (!Array.isArray(cols)) return null;
    const data = (rows as Record<string, unknown>)[name];
    const header = cols.map(fmt);
    const body: string[][] = (Array.isArray(data) ? data : []).map((r) =>
      Array.isArray(r) ? r.map(fmt) : [fmt(r)],
    );
    const widths = header.map((h, c) => Math.max(h.length, ...body.map((r) => (r[c] ?? '').length)));
    const border = `+${widths.map((w) => '-'.repeat(w + 2)).join('+')}+`;
    const line = (cells: string[]) =>
      `| ${widths.map((w, c) => (cells[c] ?? '').padEnd(w)).join(' | ')} |`;
    blocks.push([`${name} table:`, border, line(header), border, ...body.map(line), border].join('\n'));
  }
  return blocks.length > 0 ? blocks.join('\n\n') : null;
}

// Output của đề SQL được lưu dưới dạng bảng ASCII ("+----+", "| id | name |").
// Chuyển sang JSON {"columns": [...], "rows": [[...]]} để HIỂN THỊ đồng nhất với
// Input (JSON). Chỉ dùng cho phần hiển thị — output gốc dùng để so sánh vẫn giữ
// nguyên. Trả về null nếu không phải bảng ASCII hợp lệ.
function asciiTableToJson(text: string): string | null {
  const toValue = (cell: string): string | number | null => {
    if (cell === 'NULL') return null;
    if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(cell)) return Number(cell);
    return cell;
  };
  const sepMatch = text.match(/\+(?:-+\+)+/);
  if (!sepMatch) return null;
  const ncols = sepMatch[0].split('+').length - 2;
  if (ncols < 1) return null;
  // bỏ các dòng ngăn "+----+----+", rồi tách theo dấu "|"
  const parts = text
    .replace(/\+(?:-+\+)+/g, ' ')
    .split('|')
    .map((x) => x.trim());
  parts.shift();
  parts.pop();
  let rows: string[][];
  if (text.includes('\n')) {
    rows = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('|') && l.endsWith('|'))
      .map((l) => l.slice(1, -1).split('|').map((cell) => cell.trim()));
  } else {
    // output bị mất xuống dòng: các hàng liền nhau, cách nhau bởi 1 ô rỗng
    rows = [];
    for (let i = 0; i < parts.length; i += ncols + 1) rows.push(parts.slice(i, i + ncols));
  }
  if (rows.length === 0) return null;
  const [header, ...body] = rows;
  return JSON.stringify({ columns: header, rows: body.map((r) => r.map(toValue)) });
}

/* ---------------- types ---------------- */

type LayoutMode = 'split' | 'statement' | 'editor';
type BottomTab = 'tests' | 'console' | 'results' | 'debug';
interface ConsoleLine { time: string; msg: string; kind: 'info' | 'ok' | 'err' | 'sys' }
interface TestVerdict { id: number; status: 'AC' | 'WA' | 'TLE'; time: number; memory: number }
interface AssistantMessage { id: number; role: 'user' | 'assistant'; content: string }
interface SubmissionStatusPayload {
  submission_id: string;
  status: string;
  execution_time?: number | null;
  memory_used?: number | null;
}

const now = () => new Date().toLocaleTimeString('en-GB', { hour12: false });
const MIN_BOTTOM_PANEL_HEIGHT = 44;
const DEFAULT_BOTTOM_PANEL_HEIGHT = 256;
const COLLAPSED_BOTTOM_PANEL_HEIGHT = 48;
const BOTTOM_RESIZE_HANDLE_HEIGHT = 6;

export default function ProblemSolve() {
  const { t, i18n } = useTranslation();
  // Hỗ trợ các URL pattern:
  // - /student/problem/:id  (cũ)
  // - /student/class/:classId/homework/:homeworkId/problem/:problemId  (homework)
  // - /student/contest/:contestId/problem/:problemId  (kỳ thi trực tiếp)
  const { id, problemId: pid, classId, homeworkId, contestId: cid } = useParams<{
    id?: string;
    problemId?: string;
    classId?: string;
    homeworkId?: string;
    contestId?: string;
  }>();
  const [searchParams] = useSearchParams();
  const contestId = cid || searchParams.get('contestId') || undefined;
  const { user } = useAuth();

  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const lastCheatReportTime = useRef(0);

  const resolvedId = pid ?? id;
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: apiProblem, isLoading, error } = useProblemQuery(resolvedId);

  // danh sách đề của kỳ thi → nút chuyển bài trước / bài kế tiếp ngay trên màn hình làm bài
  const { data: contestDetail } = useQuery({
    queryKey: ['contests', contestId, 'detail'],
    queryFn: () => fetchContestDetail(contestId ?? ''),
    enabled: !!contestId,
  });
  const contestProblems = contestDetail?.problems ?? [];
  const contestIndex = contestProblems.findIndex((cp) => cp.problem_id === resolvedId);
  const prevContestProblem = contestIndex > 0 ? contestProblems[contestIndex - 1] : null;
  const nextContestProblem =
    contestIndex >= 0 && contestIndex < contestProblems.length - 1 ? contestProblems[contestIndex + 1] : null;
  const goToContestProblem = (targetId: string) => navigate(`/student/contest/${contestId}/problem/${targetId}`);

  const problemId = apiProblem?.id ?? resolvedId ?? 'unknown-problem';
  const problemTitle = apiProblem?.title ?? t('problemSolve.fallbackProblemTitle');
  const problemDifficulty = apiProblem?.difficulty ?? 'MEDIUM';
  const problemDescription = apiProblem?.description ?? '';
  const bilingualDescription = useMemo(() => splitBilingualDescription(problemDescription), [problemDescription]);
  const [descLang, setDescLang] = useState<'vi' | 'en'>(() => (i18n.language?.startsWith('en') ? 'en' : 'vi'));
  const displayedDescription = bilingualDescription
    ? (descLang === 'vi' ? bilingualDescription.vi : bilingualDescription.en)
    : problemDescription;
  const problemPoints = useMemo(() => {
    if (problemDifficulty === 'EASY') return 100;
    if (problemDifficulty === 'HARD') return 300;
    return 200;
  }, [problemDifficulty]);

  const detail: ProblemDetail = useMemo(() => getDetail(problemId, problemTitle, problemPoints), [problemId, problemTitle, problemPoints]);

  const problemTimeLimit = apiProblem?.time_limit ? `${apiProblem.time_limit} ms` : detail.timeLimit;
  const problemMemoryLimit = apiProblem?.memory_limit ? `${apiProblem.memory_limit} MB` : detail.memoryLimit;

  const getInitialSamples = useCallback(() => {
    if (apiProblem?.test_cases && apiProblem.test_cases.length > 0) {
      const visible = apiProblem.test_cases.filter((tc) => !tc.is_hidden);
      if (visible.length > 0) {
        return visible.map((tc, idx) => ({
          id: idx + 1,
          input: tidySampleText(tc.input),
          output: tidySampleText(tc.expected_output),
          explanation: '',
        }));
      }
    }
    return detail.samples.map((s) => ({ ...s }));
  }, [apiProblem?.test_cases, detail.samples]);

  /* ui state */
  const queryClient = useQueryClient();
  const [leftTab, setLeftTab] = useState<'statement' | 'submissions'>('statement');
  const [inspectedSubmission, setInspectedSubmission] = useState<SubmissionDto | null>(null);
  const {
    data: problemSubmissions = [],
    isLoading: isLoadingSubmissions,
    isFetching: isFetchingSubmissions,
  } = useProblemSubmissionsQuery(problemId);

  const restoreCodeFromSubmission = (sub: SubmissionDto) => {
    setCode(sub.source_code);
    const subLang = sub.language?.toLowerCase();
    if (subLang === 'python' || subLang === 'py') {
      setLang('python');
    } else if (subLang === 'java') {
      setLang('java');
    } else {
      setLang('cpp');
    }
    showToast(t('problemSolve.restoredCodeToast', { id: sub.id.slice(0, 8) }), 'success');
  };

  const [layout, setLayout] = useState<LayoutMode>('split');
  const [mobilePane, setMobilePane] = useState<'statement' | 'editor'>('statement');
  const [showGuide, setShowGuide] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<{ fileName: string; content: string } | null>(null);
  const hasDocument = typeof document !== 'undefined';

  /* editor state */
  const [lang, setLang] = useState<Lang>('cpp');
  const [code, setCode] = useState(() =>
    localStorage.getItem(`jh-code-${problemId}-cpp`) ?? detail.templates.cpp
  );
  const [wrap, setWrap] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [intelli, setIntelli] = useState(true);
  const [saveState, setSaveState] = useState<'saved' | 'unsaved' | 'saving'>('saved');

  /* judge state */
  const [bottomTab, setBottomTab] = useState<BottomTab>('tests');
  const [bottomHeight, setBottomHeight] = useState(DEFAULT_BOTTOM_PANEL_HEIGHT);
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true);
  const codeAreaRef = useRef<HTMLDivElement>(null);
  const bottomPanelRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const stopResizeRef = useRef<(() => void) | null>(null);

  const startBottomResize = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const codeArea = codeAreaRef.current;
    const bottomPanel = bottomPanelRef.current;
    if (!codeArea || !bottomPanel) return;

    const codeAreaTop = codeArea.getBoundingClientRect().top;
    const panelBottom = bottomPanel.getBoundingClientRect().bottom;
    const maxHeight = Math.max(
      panelBottom - codeAreaTop - BOTTOM_RESIZE_HANDLE_HEIGHT,
      MIN_BOTTOM_PANEL_HEIGHT
    );

    resizingRef.current = { startY: e.clientY, startHeight: bottomHeight };
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    function onMouseMove(event: MouseEvent) {
      const drag = resizingRef.current;
      if (!drag) return;
      const nextHeight = Math.min(
        Math.max(drag.startHeight + drag.startY - event.clientY, MIN_BOTTOM_PANEL_HEIGHT),
        maxHeight
      );
      setBottomHeight(nextHeight);
    }

    function stopResize() {
      resizingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      stopResizeRef.current = null;
    }

    function onMouseUp() {
      stopResize();
    }

    stopResizeRef.current = stopResize;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [bottomHeight]);

  useEffect(() => () => {
    stopResizeRef.current?.();
  }, []);

  const [samples, setSamples] = useState(() => getInitialSamples());
  // test của đề SQL (input là JSON) → hiển thị output cũng dạng JSON cho đồng nhất
  const displayOutput = (s: { input: string; output: string }) =>
    (sqlJsonToTables(s.input) !== null ? asciiTableToJson(s.output) : null) ?? s.output;
  const [sampleOutputs, setSampleOutputs] = useState<Record<number, { actual: string; ok: boolean; time?: number }>>({});
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [running, setRunning] = useState(false);
  const [judging, setJudging] = useState(false);
  const [judgeProgress, setJudgeProgress] = useState(0);
  const [testVerdicts, setTestVerdicts] = useState<TestVerdict[]>([]);
  const [finalVerdict, setFinalVerdict] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showAssistantMobile, setShowAssistantMobile] = useState(false);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      id: 1,
      role: 'assistant',
      content: t('problemSolve.assistantWelcome', { title: problemTitle }),
    },
  ]);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number | null>(null);
  const submissionSocketRef = useRef<Socket | null>(null);
  const customRunSocketRef = useRef<Socket | null>(null);

  useEffect(() => {
    return () => {
      submissionSocketRef.current?.disconnect();
      submissionSocketRef.current = null;
      customRunSocketRef.current?.disconnect();
      customRunSocketRef.current = null;
    };
  }, []);

  // ── Kiểm tra trạng thái kỳ thi / phòng thi khi mở bài ───────────────────────
  useEffect(() => {
    if (!contestId || user?.role !== 'student') return;

    joinContest(contestId)
      .then((res) => {
        if (res.cheat_warnings !== undefined) setCheatWarnings(res.cheat_warnings);
        if (res.is_disqualified) {
          setIsDisqualified(true);
        }
      })
      .catch((err) => {
        console.error('Không thể kiểm tra trạng thái phòng thi:', err);
      });
  }, [contestId, user?.role]);

  // ── Anti-cheat monitoring khi đang làm bài trong phòng thi ─────────────────────
  useEffect(() => {
    if (!contestId || user?.role !== 'student' || isDisqualified) return;

    const reportCheat = async (reason: string) => {
      const currentTime = Date.now();
      if (currentTime - lastCheatReportTime.current < 4000) return;
      lastCheatReportTime.current = currentTime;

      try {
        const res = await apiFetch<{
          success: boolean;
          cheat_warnings: number;
          is_disqualified: boolean;
        }>(`/api/v1/contests/${contestId}/anti-cheat/warning`, {
          method: 'POST',
        });

        setCheatWarnings(res.cheat_warnings);
        if (res.is_disqualified) {
          setIsDisqualified(true);
          showToast(t('problemSolve.disqualifiedToast'), 'error');
        } else {
          showToast(t('problemSolve.cheatWarningToast', { reason, count: res.cheat_warnings }), 'error');
        }
      } catch (err: any) {
        console.error('Không thể gửi cảnh báo gian lận:', err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        reportCheat(t('problemSolve.cheatReasonTabSwitch'));
      }
    };

    const handleBlur = () => {
      reportCheat(t('problemSolve.cheatReasonBlur'));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [contestId, user?.role, isDisqualified, showToast]);

  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownSeconds(0);
      return;
    }

    const updateCooldown = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownSeconds(remaining);
      if (remaining === 0) {
        setCooldownUntil(0);
      }
    };

    updateCooldown();
    const timer = window.setInterval(updateCooldown, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  /* load code when problem/lang changes */
  useEffect(() => {
    const saved = localStorage.getItem(`jh-code-${problemId}-${lang}`);
    setCode(saved ?? detail.templates[lang]);
    setSaveState(saved ? 'saved' : 'unsaved');
    setTestVerdicts([]);
    setFinalVerdict(null);
    setConsoleLines([]);
    setSamples(getInitialSamples());
    setSampleOutputs({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId, lang, detail, getInitialSamples]);

  useEffect(() => {
    setSamples(getInitialSamples());
  }, [getInitialSamples]);

  useEffect(() => {
    setAssistantMessages([
      {
        id: Date.now(),
        role: 'assistant',
        content: t('problemSolve.assistantWelcome', { title: problemTitle }),
      },
    ]);
    setShowAssistant(false);
    setShowAssistantMobile(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId, problemTitle]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [assistantMessages, showAssistant]);

  const pushConsole = useCallback((msg: string, kind: ConsoleLine['kind'] = 'info') => {
    setConsoleLines((prev) => [...prev, { time: now(), msg, kind }]);
  }, []);

  const onCodeChange = (v: string) => {
    setCode(v);
    setSaveState('unsaved');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      setSaveState('saving');
      localStorage.setItem(`jh-code-${problemId}-${lang}`, v);
      window.setTimeout(() => setSaveState('saved'), 350);
    }, 700);
  };

  const syncScroll = () => {
    const ta = taRef.current;
    if (!ta) return;
    if (preRef.current) {
      preRef.current.scrollTop = ta.scrollTop;
      preRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const { selectionStart: s, selectionEnd: en } = ta;
      const next = code.slice(0, s) + '    ' + code.slice(en);
      onCodeChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = s + 4;
      });
    }
  };

  /* -------- real custom run via API + Socket -------- */
  const LANG_API: Record<Lang, string> = { cpp: 'CPP', python: 'PYTHON', java: 'JAVA' };

  const runOneSample = (
    socket: Socket,
    sessionId: string,
  ): Promise<{ output: string; time?: number; ok: boolean }> =>
    new Promise((resolve) => {
      const timeout = window.setTimeout(() => {
        resolve({ output: '(timeout)', time: undefined, ok: false });
      }, 30_000);
      const handler = (payload: { session_id: string; stdout?: string; output?: string; stderr?: string; execution_time?: number; status?: string }) => {
        if (payload.session_id !== sessionId) return;
        window.clearTimeout(timeout);
        socket.off('custom_run_result', handler);
        // webhook emits 'stdout', fallback to 'output' then 'stderr'
        const raw = (payload.stdout ?? payload.output ?? payload.stderr ?? '(no output)').trim();
        resolve({ output: raw, time: payload.execution_time ?? undefined, ok: payload.status === 'OK' || payload.status === 'ACCEPTED' });
      };
      socket.on('custom_run_result', handler);
    });

  const runSamples = async () => {
    if (code.trim().length < 10) {
      pushConsole(t('problemSolve.consoleEmptyCode'), 'err');
      return;
    }
    setRunning(true);
    setBottomTab('console');
    setConsoleLines([]);
    setSampleOutputs({});
    pushConsole(`$ run --lang ${LANG_LABELS[lang]} --samples ${samples.length}`, 'sys');

    customRunSocketRef.current?.disconnect();
    const socket = createSocket();
    customRunSocketRef.current = socket;

    // Wait for connection
    const connected = await new Promise<boolean>((res) => {
      socket.once('connect', () => res(true));
      socket.once('connect_error', () => res(false));
      setTimeout(() => res(false), 5000);
    });
    if (!connected) {
      pushConsole(t('problemSolve.consoleSocketConnectError'), 'err');
      setRunning(false);
      socket.disconnect();
      customRunSocketRef.current = null;
      return;
    }

    const newOutputs: Record<number, { actual: string; ok: boolean; time?: number }> = {};

    for (let i = 0; i < samples.length; i++) {
      pushConsole(t('problemSolve.consoleRunningSample', { current: i + 1, total: samples.length }), 'info');
      try {
        const resp = await apiFetch<{ success: boolean; session_id: string }>('/api/v1/submissions/run-custom', {
          method: 'POST',
          body: JSON.stringify({
            language: LANG_API[lang],
            source_code: code,
            custom_input: samples[i].input,
          }),
        });
        socket.emit('join_custom_run', { session_id: resp.session_id });
        const result = await runOneSample(socket, resp.session_id);
        const expected = samples[i].output.trim();
        const isCorrect = result.output === expected;
        newOutputs[i] = { actual: result.output, ok: isCorrect, time: result.time };
        setSampleOutputs({ ...newOutputs });
        if (isCorrect) {
          pushConsole(`Test ${i + 1}: OK${result.time !== undefined ? ` (${result.time}ms)` : ''}`, 'ok');
        } else {
          pushConsole(`Test ${i + 1}: WRONG ANSWER`, 'err');
          pushConsole(`  Expected: ${expected.slice(0, 100)}${expected.length > 100 ? '\u2026' : ''}`, 'info');
          pushConsole(`  Got:      ${result.output.slice(0, 100)}${result.output.length > 100 ? '\u2026' : ''}`, 'err');
        }
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : t('problemSolve.unknownError');
        pushConsole(`Test ${i + 1}: ERROR — ${msg}`, 'err');
        newOutputs[i] = { actual: `ERROR: ${msg}`, ok: false };
        setSampleOutputs({ ...newOutputs });
      }
    }

    socket.disconnect();
    customRunSocketRef.current = null;
    setRunning(false);
    pushConsole(t('problemSolve.consoleRunSamplesDone'), 'sys');
  };

  const submit = async () => {
    if (isDisqualified) {
      showToast(t('problemSolve.disqualifiedSubmitToast'), 'error');
      return;
    }
    setJudging(true);
    setBottomTab('console');
    setConsoleLines([]);
    setFinalVerdict(null);
    setTestVerdicts([]);
    setJudgeProgress(0);
    pushConsole(`$ judge --submit ${detail.code} --lang ${LANG_LABELS[lang]}`, 'sys');
    pushConsole(t('problemSolve.consoleSubmitting'), 'info');
    let submissionId: string;
    try {
      const response = await apiFetch<{ submission_id: string }>('/api/v1/submissions', {
        method: 'POST',
        body: JSON.stringify({
          problem_id: problemId,
          language: lang === 'cpp' ? 'CPP' : lang === 'python' ? 'PYTHON' : 'JAVA',
          source_code: code,
          contest_id: contestId || undefined,
        }),
      });
      submissionId = response.submission_id;
      if (!submissionId) {
        throw new Error(t('problemSolve.submissionIdMissingError'));
      }
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        if (submitError.status === 429) {
          showToast(t('problemSolve.throttledToast'), 'error');
          setCooldownUntil(Date.now() + 60_000);
          pushConsole('error: throttled by server (429 Too Many Requests)', 'err');
        } else if (submitError.status === 403) {
          showToast(t('problemSolve.contestClosedToast'), 'error');
          pushConsole('error: deadline passed (403 Forbidden)', 'err');
        } else if (submitError.status === 409) {
          showToast(t('problemSolve.duplicateSubmissionToast'), 'error');
          pushConsole('error: conflict detected (409 Conflict)', 'err');
        } else {
          showToast(submitError.message || t('problemSolve.submitFailedToast'), 'error');
          pushConsole(t('problemSolve.consoleSubmitFailed'), 'err');
        }
      } else {
        showToast(t('problemSolve.submitFailedToast'), 'error');
        pushConsole(t('problemSolve.consoleSubmitFailed'), 'err');
      }
      setJudging(false);
      return;
    }

    const socket = createSocket();
    submissionSocketRef.current?.disconnect();
    submissionSocketRef.current = socket;

    const terminalVerdicts: Record<string, string> = {
      ACCEPTED: 'AC',
      WRONG_ANSWER: 'WA',
      TIME_LIMIT_EXCEEDED: 'TLE',
      COMPILE_ERROR: 'CE',
      RUNTIME_ERROR: 'RTE',
    };

    const watchdogTimer = window.setTimeout(() => {
      showToast(t('problemSolve.watchdogTimeoutToast'), 'error');
      pushConsole(t('problemSolve.consoleJudgeNoResponse'), 'err');
      setJudging(false);
      socket.disconnect();
      submissionSocketRef.current = null;
    }, 60000);

    socket.on('connect', () => {
      socket.emit('join_submission', { submission_id: submissionId });
      pushConsole(t('problemSolve.consoleSocketConnected', { id: submissionId.slice(0, 8) }), 'info');
    });

    socket.on('submission_status_changed', (payload: SubmissionStatusPayload) => {
      const status = payload.status.toUpperCase();
      const verdict = terminalVerdicts[status];
      setJudgeProgress(verdict ? 100 : status === 'IN_QUEUE' ? 35 : 15);
      pushConsole(t('problemSolve.consoleSubmissionStatus', { status }), verdict === 'AC' ? 'ok' : verdict ? 'err' : 'info');

      if (!verdict) return;

      queryClient.invalidateQueries({ queryKey: ['submissions', 'problem', problemId] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });

      window.clearTimeout(watchdogTimer);
      setFinalVerdict(verdict);
      setBottomTab('results');
      setJudging(false);
      socket.disconnect();
      submissionSocketRef.current = null;
    });

    socket.on('connect_error', (err) => {
      window.clearTimeout(watchdogTimer);
      showToast(t('problemSolve.judgeServerConnectError'), 'error');
      pushConsole(t('problemSolve.consoleSocketError', { message: err?.message || t('problemSolve.connectionErrorFallback') }), 'err');
      setJudging(false);
      socket.disconnect();
      submissionSocketRef.current = null;
    });
  };

  /* -------- misc actions -------- */
  const copyText = (text: string, btnId: string) => {
    navigator.clipboard?.writeText(text);
    const el = document.getElementById(btnId);
    if (el) {
      el.dataset.copied = '1';
      setTimeout(() => (el.dataset.copied = ''), 1200);
    }
  };

  const uploadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Chuẩn hoá line ending (CRLF/CR -> LF): trình duyệt tự quy LF khi render
      // HTML, nhưng việc đếm dòng ở gutter dựa trên split('\n') nên nếu không
      // chuẩn hoá trước, các dòng kết thúc bằng \r đơn lẻ sẽ không được đánh số.
      const normalized = String(reader.result ?? '').replace(/\r\n?/g, '\n');
      setUploadPreview({ fileName: file.name, content: normalized });
    };
    reader.readAsText(file);
  };

  const confirmUploadPreview = () => {
    if (!uploadPreview) return;
    onCodeChange(uploadPreview.content);
    setUploadPreview(null);
  };

  const downloadStatement = () => {
    const text = detail.sections
      .map((s) => `${s.heading ? `## ${s.heading}\n` : ''}${(s.paragraphs ?? []).join('\n')}${(s.bullets ?? []).map((b) => `\n- ${b}`).join('')}`)
      .join('\n\n');
    const markdown = problemDescription ? `${problemDescription}\n\n${text}` : text;
    const blob = new Blob([`# ${problemTitle} (${detail.code})\n\n${markdown}`], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${detail.code}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const getAssistantReply = (text: string) => {
    const input = text.toLowerCase();
    if (input.includes('gợi ý') || input.includes('hint') || input.includes('ý tưởng')) {
      return t('problemSolve.assistantHintReply', { title: problemTitle });
    }
    if (input.includes('độ phức tạp') || input.includes('complex')) {
      return t('problemSolve.assistantComplexityReply');
    }
    if (input.includes('code') || input.includes('viết') || input.includes('c++') || input.includes('python') || input.includes('java')) {
      return t('problemSolve.assistantCodeReply', { code: detail.code });
    }
    if (input.includes('đề bài') || input.includes('ý nghĩa')) {
      return t('problemSolve.assistantStatementReply', { title: problemTitle });
    }
    return t('problemSolve.assistantDefaultReply', { title: problemTitle });
  };

  const askAssistant = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = assistantInput.trim();
    if (!text) return;

    setAssistantMessages((prev) => [...prev, { id: Date.now(), role: 'user', content: text }]);
    setAssistantInput('');
    setAssistantBusy(true);

    window.setTimeout(() => {
      const reply = getAssistantReply(text);
      setAssistantMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', content: reply }]);
      setAssistantBusy(false);
    }, 450);
  };

  const solved = false;

  const lineCount = code.split('\n').length;
  const highlighted = useMemo(() => highlight(code, lang), [code, lang]);

  const diffChip =
    problemDifficulty === 'EASY'
      ? 'text-[var(--ws-ok)] bg-[color:var(--ws-accent-soft)]'
      : problemDifficulty === 'MEDIUM'
      ? 'text-[var(--ws-warn)] bg-[color:var(--ws-accent-soft)]'
      : 'text-[var(--ws-danger)] bg-[color:var(--ws-accent-soft)]';

  const isSubmitLocked = running || judging || cooldownSeconds > 0;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-(--ws-bg) text-(--ws-text)">
        <div className="w-full max-w-3xl px-6">
          <div className="h-5 w-44 rounded bg-(--ws-panel2) animate-pulse mb-4" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-112 rounded-2xl border border-(--ws-border) bg-(--ws-panel) animate-pulse" />
            <div className="h-112 rounded-2xl border border-(--ws-border) bg-(--ws-panel) animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-(--ws-bg) text-(--ws-text) px-6">
        <div className="max-w-lg w-full rounded-3xl border border-(--ws-border) bg-(--ws-panel) p-8 text-center shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-(--ws-faint)">404</p>
          <h1 className="mt-3 text-2xl font-bold">{t('problemSolve.notFoundTitle')}</h1>
          <p className="mt-3 text-sm text-(--ws-muted)">{t('problemSolve.notFoundSubtitle')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-(--ws-bg) text-(--ws-text) px-6">
        <div className="max-w-lg w-full rounded-3xl border border-(--ws-border) bg-(--ws-panel) p-8 text-center shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-(--ws-faint)">{t('problemSolve.loadErrorBadge')}</p>
          <h1 className="mt-3 text-2xl font-bold">{t('problemSolve.loadErrorHeading')}</h1>
          <p className="mt-3 text-sm text-(--ws-muted)">{t('problemSolve.tryAgainLater')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full text-(--ws-text)">
      {/* problem header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-(--ws-border) bg-(--ws-panel) flex-wrap">
          {/* Back button */}
          {classId && homeworkId ? (
            <button
              onClick={() => navigate(`/student/class/${classId}/homework/${homeworkId}`)}
              className="flex items-center gap-1 text-[12px] text-(--ws-muted) hover:text-(--ws-text) transition-colors mr-1"
              title={t('problemSolve.backToProblemsTitle')}
            >
              ← {t('problemSolve.backToProblems')}
            </button>
          ) : (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-[12px] text-(--ws-muted) hover:text-(--ws-text) transition-colors mr-1"
              title={t('problemSolve.backToListTitle')}
            >
              ← {t('studentContest.back')}
            </button>
          )}
          <h1 className="text-[17px] font-bold">{problemTitle}</h1>
          <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-md ${diffChip}`}>{problemDifficulty === 'EASY' ? t('problemForm.easy') : problemDifficulty === 'MEDIUM' ? t('problemForm.medium') : t('problemForm.hard')}</span>
          {contestId && (
            <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md border ${
              isDisqualified
                ? 'bg-red-100 text-red-800 border-red-300'
                : cheatWarnings > 0
                ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                : 'bg-purple-100 text-purple-800 border-purple-200'
            }`}>
              🛡️ {isDisqualified ? t('problemSolve.cheatDisqualifiedBadge') : cheatWarnings > 0 ? t('problemSolve.cheatWarningBadge', { count: cheatWarnings }) : t('problemSolve.onlineExamBadge')}
            </span>
          )}
          {solved && (
            <span className="flex items-center gap-1 text-[12px] font-semibold text-(--ws-ok)">
              <CheckCircle2 size={14} /> {t('studentHomework.completed')}
            </span>
          )}
          <div className="flex-1" />
          {contestId && contestIndex >= 0 && contestProblems.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => prevContestProblem && goToContestProblem(prevContestProblem.problem_id)}
                disabled={!prevContestProblem}
                title={prevContestProblem ? `${t('problemSolve.prevProblem')}: ${prevContestProblem.problem.title}` : t('problemSolve.prevProblem')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-(--ws-border) text-[12.5px] font-medium text-(--ws-muted) hover:text-(--ws-accent) hover:border-(--ws-accent) transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft size={14} /> {t('problemSolve.prevProblem')}
              </button>
              <span className="px-1.5 text-[12.5px] font-semibold text-(--ws-muted) tabular-nums">
                {contestIndex + 1}/{contestProblems.length}
              </span>
              <button
                onClick={() => nextContestProblem && goToContestProblem(nextContestProblem.problem_id)}
                disabled={!nextContestProblem}
                title={nextContestProblem ? `${t('problemSolve.nextProblem')}: ${nextContestProblem.problem.title}` : t('problemSolve.nextProblem')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-(--ws-border) text-[12.5px] font-medium text-(--ws-muted) hover:text-(--ws-accent) hover:border-(--ws-accent) transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                {t('problemSolve.nextProblem')} <ChevronRight size={14} />
              </button>
            </div>
          )}
          <button
            onClick={() => setShowGuide(true)}
            className="p-2 rounded-lg border border-(--ws-border) text-(--ws-muted) hover:text-(--ws-accent) hover:border-(--ws-accent) transition-colors"
            title={t("problemSolve.usageGuide")}
          >
            <HelpCircle size={15} />
          </button>
          <div className="flex items-center rounded-lg border border-(--ws-border) overflow-hidden">
            {([['split', <Columns size={14} key="c" />], ['statement', <FileText size={14} key="f" />], ['editor', <Code size={14} key="e" />]] as [LayoutMode, React.ReactNode][]).map(([mode, icon]) => (
              <button
                key={mode}
                onClick={() => setLayout(mode)}
                className={`px-2.5 py-2 transition-colors ${layout === mode ? 'bg-(--ws-accent-soft) text-(--ws-accent)' : 'text-(--ws-muted) hover:text-(--ws-text)'}`}
                title={mode === 'split' ? t('problemSolve.modeSplit') : mode === 'statement' ? t('problemSolve.modeStatementOnly') : t('problemSolve.modeEditorOnly')}
              >
                {icon}
              </button>
            ))}
          </div>
          {/* trong kỳ thi không có trợ lý: ẩn nút "Mở trợ lý" */}
          {!contestId && (
            <button
              onClick={() => setShowAssistant((v) => !v)}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12.5px] font-medium transition-colors ${showAssistant ? 'border-(--ws-accent) text-(--ws-accent) bg-(--ws-accent-soft)' : 'border-(--ws-border) text-(--ws-muted) hover:text-(--ws-text) hover:border-(--ws-accent)'}`}
            >
              <MessageCircle size={14} /> {showAssistant ? t('problemSolve.hideAssistant') : t('problemSolve.openAssistant')}
            </button>
          )}
        </div>

        {/* mobile pane switch */}
        <div className="md:hidden flex border-b border-(--ws-border) bg-(--ws-panel)">
          {(['statement', 'editor'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setMobilePane(p)}
              className={`flex-1 py-2.5 text-[13px] font-semibold ${mobilePane === p ? 'text-(--ws-accent) border-b-2 border-(--ws-accent)' : 'text-(--ws-muted)'}`}
            >
              {p === 'statement' ? t('problemSolve.statementTab') : 'Code'}
            </button>
          ))}
        </div>

        {/* ============ SPLIT BODY ============ */}
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex min-h-0 min-w-0">
            {/* ---- statement / submissions pane ---- */}
            {(layout !== 'editor') && (
              <section
                className={`flex flex-col min-h-0 bg-(--ws-bg) ${
                  layout === 'split'
                    ? `${mobilePane === 'statement' ? 'flex' : 'hidden'} md:flex md:w-1/2 border-r border-(--ws-border)`
                    : 'w-full flex'
                }`}
              >
                {/* Left Pane Navigation Tabs */}
                <div className="flex items-stretch gap-1 px-4 min-h-[52px] border-b border-(--ws-border) bg-(--ws-panel) shrink-0">
                  <button
                    onClick={() => setLeftTab('statement')}
                    className={`flex items-center gap-2 px-3.5 py-2.5 text-[12.5px] font-semibold border-b-2 transition-all ${
                      leftTab === 'statement'
                        ? 'border-(--ws-accent) text-(--ws-accent)'
                        : 'border-transparent text-(--ws-muted) hover:text-(--ws-text)'
                    }`}
                  >
                    <FileText size={14} />
                    {t('problemSolve.statement', 'Đề bài')}
                  </button>
                  <button
                    onClick={() => setLeftTab('submissions')}
                    className={`flex items-center gap-2 px-3.5 py-2.5 text-[12.5px] font-semibold border-b-2 transition-all ${
                      leftTab === 'submissions'
                        ? 'border-(--ws-accent) text-(--ws-accent)'
                        : 'border-transparent text-(--ws-muted) hover:text-(--ws-text)'
                    }`}
                  >
                    <Clock size={14} />
                    {t('problemSolve.submissionHistory', 'Lịch sử nộp')}
                    {problemSubmissions.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-(--ws-accent-soft) text-(--ws-accent) font-bold">
                        {problemSubmissions.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Left Pane Body */}
                <div className="flex-1 overflow-y-auto ws-editor-scroll">
                  {leftTab === 'statement' ? (
                    <div className="px-7 py-6 max-w-3xl">
                      {/* limits */}
                      <div className="grid grid-cols-3 gap-6 pb-5 border-b border-(--ws-border)">
                        <div>
                          <p className="text-[10.5px] font-bold uppercase tracking-widest text-(--ws-faint) mb-1.5">{t('problemSolve.timeLimit')}</p>
                          <p className="text-[15px] font-bold font-mono">{problemTimeLimit}</p>
                        </div>
                        <div>
                          <p className="text-[10.5px] font-bold uppercase tracking-widest text-(--ws-faint) mb-1.5">{t('problemSolve.memoryLimit')}</p>
                          <p className="text-[15px] font-bold font-mono">{problemMemoryLimit}</p>
                        </div>
                        <div>
                          <p className="text-[10.5px] font-bold uppercase tracking-widest text-(--ws-faint) mb-1.5">{t('problemSolve.maxScore')}</p>
                          <p className="text-[15px] font-bold font-mono">{detail.points}</p>
                        </div>
                      </div>

                      <button
                        onClick={downloadStatement}
                        className="mt-5 flex items-center gap-1.5 text-[13px] font-medium text-(--ws-accent) hover:underline"
                      >
                        <Download size={14} /> {t('problemSolve.downloadOriginal')}
                      </button>

                      <h2 className="mt-6 mb-5 text-[26px] font-extrabold leading-tight">{problemTitle}</h2>

                      {bilingualDescription && (
                        <div className="flex items-center gap-2 mb-4">
                          <Languages size={14} className="text-(--ws-muted)" />
                          <div className="flex items-center gap-1 p-1 rounded-lg bg-(--ws-panel2) border border-(--ws-border)">
                            <button
                              type="button"
                              onClick={() => setDescLang('vi')}
                              className={`px-3 py-1 text-[12px] font-semibold rounded-md transition-colors ${
                                descLang === 'vi'
                                  ? 'bg-(--ws-accent-soft) text-(--ws-accent)'
                                  : 'text-(--ws-muted) hover:text-(--ws-text)'
                              }`}
                            >
                              Tiếng Việt
                            </button>
                            <button
                              type="button"
                              onClick={() => setDescLang('en')}
                              className={`px-3 py-1 text-[12px] font-semibold rounded-md transition-colors ${
                                descLang === 'en'
                                  ? 'bg-(--ws-accent-soft) text-(--ws-accent)'
                                  : 'text-(--ws-muted) hover:text-(--ws-text)'
                              }`}
                            >
                              English
                            </button>
                          </div>
                        </div>
                      )}

                      {displayedDescription && (
                        <div className="mb-7 rounded-xl border border-(--ws-border) bg-(--ws-panel) p-6">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                            {formatLeetCodeStyleExamples(displayedDescription)}
                          </ReactMarkdown>
                        </div>
                      )}

                      {/* bảng "Ràng buộc" (thời gian/bộ nhớ…) đã được hiển thị ở phần đầu trang nên không lặp lại */}
                      {detail.sections.filter((sec) => !sec.table).map((sec, i) => (
                        <div key={i} className="mb-7">
                          {sec.heading && <h3 className="text-[19px] font-bold mb-3">{sec.heading}</h3>}
                          {sec.paragraphs?.map((p, j) => (
                            <p key={j} className="text-[14.5px] leading-7 text-(--ws-text)/90 mb-2">{p}</p>
                          ))}
                          {sec.bullets && /^(?:Đầu vào|Input)$/i.test(sec.heading ?? '') && (
                            // phần "Đầu vào": hiển thị như đoạn văn thường, không dấu chấm tròn / thụt lề
                            <>
                              {sec.bullets.map((b, j) => (
                                <p key={j} className="text-[14.5px] leading-7 text-(--ws-text)/90 mb-2">{b}</p>
                              ))}
                            </>
                          )}
                          {sec.bullets && !/^(?:Đầu vào|Input)$/i.test(sec.heading ?? '') && (
                            <ul className="space-y-2 ml-1">
                              {sec.bullets.map((b, j) => (
                                <li key={j} className="flex gap-2.5 text-[14.5px] leading-7">
                                  <span className="mt-[11px] w-1.5 h-1.5 rounded-full bg-(--ws-accent) shrink-0" />
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {sec.table && (
                            <div className="overflow-hidden rounded-lg border border-(--ws-border)">
                              <table className="w-full text-[13.5px]">
                                <thead>
                                  <tr className="bg-(--ws-panel2)">
                                    {sec.table.head.map((h, j) => (
                                      <th key={j} className="text-left px-4 py-2.5 font-bold">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {sec.table.rows.map((r, j) => (
                                    <tr key={j} className="border-t border-(--ws-border)">
                                      <td className="px-4 py-2.5 font-semibold italic">{r[0]}</td>
                                      <td className="px-4 py-2.5 font-mono text-[13px]">{r[1]}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}

                    </div>
                  ) : (
                    /* ---- submissions tab content ---- */
                    <div className="p-6 max-w-3xl">
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <h2 className="text-lg font-bold text-(--ws-text)">{t('problemSolve.submissionHistoryHeading')}</h2>
                          <p className="text-xs text-(--ws-muted) mt-0.5">
                            {t('problemSolve.submissionHistorySubtitle')}
                          </p>
                        </div>
                        <button
                          onClick={() => queryClient.invalidateQueries({ queryKey: ['submissions', 'problem', problemId] })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--ws-border) text-xs text-(--ws-muted) hover:text-(--ws-text) hover:border-(--ws-accent) transition-colors"
                          title={t('problemSolve.refreshListTitle')}
                        >
                          <RefreshCw size={13} className={isFetchingSubmissions ? 'animate-spin' : ''} />
                          {t('problemSolve.refreshBtn')}
                        </button>
                      </div>

                      {isLoadingSubmissions ? (
                        <div className="flex flex-col items-center justify-center py-16 text-(--ws-muted)">
                          <Loader2 size={28} className="animate-spin mb-3 text-(--ws-accent)" />
                          <p className="text-sm">{t('problemSolve.loadingSubmissionHistory')}</p>
                        </div>
                      ) : problemSubmissions.length === 0 ? (
                        <div className="rounded-2xl border border-(--ws-border) bg-(--ws-panel) p-12 text-center">
                          <Clock size={36} className="text-(--ws-muted) mx-auto mb-3 opacity-60" />
                          <h3 className="font-semibold text-base mb-1">{t('problemSolve.noSubmissionsYet')}</h3>
                          <p className="text-xs text-(--ws-muted) max-w-xs mx-auto">
                            {t('problemSolve.noSubmissionsHint')}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {problemSubmissions.map((sub) => {
                            const isInspecting = inspectedSubmission?.id === sub.id;
                            const statusUpper = sub.status?.toUpperCase();
                            const isAc = statusUpper === 'ACCEPTED' || statusUpper === 'AC';
                            const isWa = statusUpper === 'WRONG_ANSWER' || statusUpper === 'WA';
                            const isTle = statusUpper === 'TIME_LIMIT_EXCEEDED' || statusUpper === 'TLE';
                            const isCe = statusUpper === 'COMPILE_ERROR' || statusUpper === 'CE';

                            const badgeClass = isAc
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : isWa
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : isTle
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : isCe
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-orange-100 text-orange-800 border-orange-300';

                            const badgeIcon = isAc ? (
                              <CheckCircle2 size={13} className="text-emerald-700" />
                            ) : isWa ? (
                              <XCircle size={13} className="text-rose-700" />
                            ) : (
                              <Clock size={13} className="text-amber-700" />
                            );

                            return (
                              <div
                                key={sub.id}
                                className={`rounded-xl border transition-all ${
                                  isInspecting
                                    ? 'border-(--ws-accent) bg-(--ws-panel) shadow-sm'
                                    : 'border-(--ws-border) bg-(--ws-panel) hover:border-(--ws-accent)/50'
                                }`}
                              >
                                <div className="p-4 flex flex-col gap-3">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeClass}`}
                                      >
                                        {badgeIcon}
                                        {sub.status}
                                      </span>
                                      <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-(--ws-panel2) text-(--ws-muted) font-semibold">
                                        {sub.language}
                                      </span>
                                    </div>
                                    <span className="text-xs text-(--ws-muted) flex items-center gap-1">
                                      <Clock size={12} />
                                      {formatVNFull(sub.created_at)}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-4 text-xs text-(--ws-muted)">
                                    <span>
                                      {t('problemSolve.executionTimeLabel')} <strong className="text-(--ws-text)">{sub.execution_time != null ? `${sub.execution_time} ms` : '—'}</strong>
                                    </span>
                                    <span>
                                      {t('problemSolve.memoryUsedLabel')} <strong className="text-(--ws-text)">{sub.memory_used != null ? `${(sub.memory_used / 1024).toFixed(1)} MB` : '—'}</strong>
                                    </span>
                                  </div>

                                  {sub.instructor_score != null && (
                                    <div className="flex flex-col gap-1 text-xs bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-lg">
                                      <div className="flex items-center gap-1.5 font-bold">
                                        <span>{t('problemSolve.instructorScoreLabel', { score: sub.instructor_score })}</span>
                                      </div>
                                      {sub.instructor_feedback && (
                                        <p className="text-[11px] text-amber-800 italic bg-white/70 p-1.5 rounded border border-amber-100">
                                          "{sub.instructor_feedback}"
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2 pt-2 border-t border-(--ws-border) flex-wrap">
                                    <button
                                      onClick={() => setInspectedSubmission(isInspecting ? null : sub)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--ws-border) text-xs font-medium text-(--ws-text) hover:border-(--ws-accent) transition-colors"
                                    >
                                      <Code size={13} />
                                      {isInspecting ? t('problemSolve.closeCode') : t('problemSolve.viewCode')}
                                    </button>
                                    <button
                                      onClick={() => restoreCodeFromSubmission(sub)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--ws-accent) text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                                      title={t('problemSolve.loadIntoEditorTitle')}
                                    >
                                      <ClipboardPaste size={13} />
                                      {t('problemSolve.loadIntoEditorBtn')}
                                    </button>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard?.writeText(sub.source_code);
                                        showToast(t('problemSolve.copiedSourceToast'), 'success');
                                      }}
                                      className="p-1.5 rounded-lg border border-(--ws-border) text-(--ws-muted) hover:text-(--ws-text) transition-colors ml-auto"
                                      title={t('problemSolve.copySourceTitle')}
                                    >
                                      <Copy size={13} />
                                    </button>
                                  </div>

                                  {isInspecting && (
                                    <div className="mt-2 rounded-lg bg-(--ws-panel2) p-3 border border-(--ws-border) overflow-hidden">
                                      <div className="flex items-center justify-between text-[11px] text-(--ws-muted) mb-2 pb-1.5 border-b border-(--ws-border)">
                                        <span>{t('problemSolve.submissionSourceHeader', { id: sub.id.slice(0, 8), lang: sub.language })}</span>
                                        <span>{t('problemSolve.lineCountSuffix', { count: sub.source_code.split('\n').length })}</span>
                                      </div>
                                      <pre className="text-xs font-mono text-(--ws-text) overflow-x-auto whitespace-pre p-1">
                                        {sub.source_code}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ---- editor pane ---- */}
            {(layout !== 'statement') && (
              <section
                className={`min-w-0 bg-(--ws-editor) ${
                  layout === 'split'
                    ? `${mobilePane === 'editor' ? 'flex' : 'hidden'} md:flex md:w-1/2 flex-col`
                    : 'flex w-full flex-col'
                }`}
              >
              {/* editor toolbar */}
              <div className="flex items-center gap-2 px-3 py-2 min-h-[52px] border-b border-(--ws-border) flex-wrap">
                {/* trong kỳ thi không cho tải file lên: ẩn nhóm "Viết code / Tải file" */}
                {!contestId && (
                  <div className="flex items-center rounded-lg border border-(--ws-border) overflow-hidden text-[12.5px] font-semibold">
                    <button className="px-3 py-1.5 bg-(--ws-accent-soft) text-(--ws-accent)">{t('problemSolve.writeCode')}</button>
                    <label className="px-3 py-1.5 text-(--ws-muted) hover:text-(--ws-text) cursor-pointer">
                      {t('problemSolve.uploadFile')}
                      <input
                        type="file"
                        accept=".cpp,.py,.java,.txt"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) uploadFile(e.target.files[0]);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                )}
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Lang)}
                  className="px-2.5 py-1.5 bg-(--ws-panel2) border border-(--ws-border) rounded-lg text-[12.5px] font-medium focus:outline-none focus:border-(--ws-accent)"
                >
                  {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
                    <option key={l} value={l}>{LANG_LABELS[l]}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-(--ws-border) text-[12.5px] text-(--ws-muted) cursor-pointer hover:text-(--ws-text)">
                  <input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} className="accent-(--ws-accent)" />
                  {t('problemSolve.wordWrap')}
                </label>
                <button
                  onClick={() => onCodeChange(detail.templates[lang])}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-(--ws-border) text-[12.5px] text-(--ws-muted) hover:text-(--ws-text) transition-colors"
                >
                  <RotateCcw size={13} /> {t('problemSolve.resetCode')}
                </button>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(+e.target.value)}
                  className="px-2 py-1.5 bg-(--ws-panel2) border border-(--ws-border) rounded-lg text-[12.5px] focus:outline-none"
                >
                  {[12, 13, 14, 16, 18].map((s) => <option key={s} value={s}>{s}px</option>)}
                </select>

                <div className="flex-1" />
                <span className={`text-[11.5px] ${saveState === 'saved' ? 'text-(--ws-faint)' : 'text-(--ws-warn)'}`}>
                  {saveState === 'saved' ? t('problemSolve.saved') : saveState === 'saving' ? t('problemSolve.saving') : t('problemSolve.unsaved')}
                </span>
              </div>

              {/* intellisense row */}
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-(--ws-border-soft)">
                <label className="flex items-center gap-2 text-[12.5px] text-(--ws-muted) cursor-pointer select-none">
                  IntelliSense
                  <button
                    onClick={() => setIntelli(!intelli)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${intelli ? 'bg-(--ws-accent)' : 'bg-(--ws-border)'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${intelli ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </label>
                {intelli && (
                  <span className="text-[11px] text-(--ws-faint) hidden sm:block">
                    {t('problemSolve.lineCount', { count: lineCount })} • {t('problemSolve.charCount', { count: code.length })} • {LANG_LABELS[lang]}
                  </span>
                )}
              </div>

              {/* code area */}
              <div ref={codeAreaRef} className="relative flex-1 min-h-0 overflow-hidden" style={{ fontSize }}>
                {/* gutter */}
                <div
                  ref={gutterRef}
                  className="absolute left-0 top-0 bottom-0 w-12 overflow-hidden py-3 text-right pr-3 select-none font-mono leading-6 text-(--ws-gutter)"
                  aria-hidden
                >
                  {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                {/* highlight layer */}
                <pre
                  ref={preRef}
                  aria-hidden
                  className={`absolute inset-0 left-12 m-0 py-3 pr-4 font-mono leading-6 pointer-events-none overflow-hidden text-(--ws-text) ${
                    wrap ? 'whitespace-pre-wrap wrap-break-word' : 'whitespace-pre'
                  }`}
                  dangerouslySetInnerHTML={{ __html: highlighted + '\n' }}
                />
                {/* textarea */}
                <textarea
                  ref={taRef}
                  value={code}
                  onChange={(e) => onCodeChange(e.target.value)}
                  onScroll={syncScroll}
                  onKeyDown={onKeyDown}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  className={`ws-editor-scroll absolute inset-0 left-12 w-[calc(100%-3rem)] h-full py-3 pr-4 bg-transparent font-mono leading-6 resize-none outline-none text-transparent caret-(--ws-accent) selection:bg-(--ws-accent-soft) ${
                    wrap ? 'whitespace-pre-wrap wrap-break-word' : 'whitespace-pre overflow-auto'
                  }`}
                />
              </div>

              {bottomPanelOpen && (
                <div
                  onMouseDown={startBottomResize}
                  className="group h-1.5 shrink-0 cursor-row-resize bg-transparent hover:bg-(--ws-accent-soft) transition-colors relative"
                  role="separator"
                  aria-orientation="horizontal"
                  aria-label={t('problemSolve.dragResizeLabel')}
                >
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-1 rounded-full bg-(--ws-border) group-hover:bg-(--ws-accent) transition-colors" />
                </div>
              )}

              {/* ============ bottom panel ============ */}
              <div
                ref={bottomPanelRef}
                className="border-t border-(--ws-border) bg-(--ws-panel) flex flex-col shrink-0 overflow-hidden"
                style={{ height: bottomPanelOpen ? bottomHeight : COLLAPSED_BOTTOM_PANEL_HEIGHT }}
              >
                <div className={`flex items-center gap-1 px-3 ${bottomPanelOpen ? 'pt-2 border-b border-(--ws-border-soft)' : 'h-12'}`}>
                  {([
                    ['tests', t('problemSolve.tabSamples'), <FlaskConical size={13} key="i" />],
                    ['console', t('problemSolve.consoleTab'), <Terminal size={13} key="i" />],
                    ['results', t('problemSolve.tabResults'), <CheckCircle2 size={13} key="i" />],
                    ['debug', t('problemSolve.debugTab'), <Bug size={13} key="i" />],
                  ] as [BottomTab, string, React.ReactNode][]).map(([tab, label, icon]) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setBottomTab(tab);
                        if (!bottomPanelOpen) {
                          setBottomHeight(DEFAULT_BOTTOM_PANEL_HEIGHT);
                          setBottomPanelOpen(true);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-semibold border-b-2 -mb-px transition-colors ${
                        bottomTab === tab
                          ? 'text-(--ws-accent) border-(--ws-accent)'
                          : 'text-(--ws-muted) border-transparent hover:text-(--ws-text)'
                      }`}
                    >
                      {icon} {label}
                      {tab === 'results' && finalVerdict && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${finalVerdict === 'AC' ? 'bg-(--ws-accent-soft) text-(--ws-ok)' : 'bg-red-500/15 text-(--ws-danger)'}`}>
                          {finalVerdict}
                        </span>
                      )}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <div className={`flex items-center gap-2 ${bottomPanelOpen ? 'pb-1.5' : ''}`}>
                    <button
                      onClick={runSamples}
                      disabled={running || judging}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--ws-border) text-[12.5px] font-semibold text-(--ws-text) hover:border-(--ws-accent) hover:text-(--ws-accent) transition-colors disabled:opacity-50"
                    >
                      {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} {t('problemSolve.runBtn')}
                    </button>
                    <button
                      onClick={submit}
                      disabled={isSubmitLocked}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#193a2b] text-white text-[12.5px] font-bold hover:bg-[#122c26] transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(25,58,43,0.22)]"
                    >
                      {judging ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} {cooldownSeconds > 0 ? t('problemSolve.submitCooldown', { seconds: cooldownSeconds }) : t('problemSolve.submitBtn')}
                    </button>
                    <button
                      onClick={() => {
                        if (bottomPanelOpen) {
                          setBottomPanelOpen(false);
                        } else {
                          setBottomHeight(DEFAULT_BOTTOM_PANEL_HEIGHT);
                          setBottomPanelOpen(true);
                        }
                      }}
                      className="p-1.5 rounded-lg border border-(--ws-border) text-(--ws-muted) hover:text-(--ws-accent) hover:border-(--ws-accent) transition-colors"
                      title={t(bottomPanelOpen ? 'problemSolve.collapsePanel' : 'problemSolve.expandPanel')}
                      aria-label={t(bottomPanelOpen ? 'problemSolve.collapsePanel' : 'problemSolve.expandPanel')}
                      aria-expanded={bottomPanelOpen}
                    >
                      {bottomPanelOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                  </div>
                </div>

                {bottomPanelOpen && <div className="flex-1 overflow-y-auto ws-editor-scroll p-4">
                  {judging && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-[11.5px] text-(--ws-muted) mb-1.5">
                        <span>{t('problemSolve.judging', { percent: Math.round(judgeProgress) })}</span>
                        <span>{Math.round((judgeProgress / 100) * 8)}/8 tests</span>
                      </div>
                      <div className="h-1.5 bg-(--ws-panel2) rounded-full overflow-hidden">
                        <div className="h-full bg-(--ws-accent) transition-all duration-300" style={{ width: `${judgeProgress}%` }} />
                      </div>
                    </div>
                  )}

                  {bottomTab === 'tests' && (
                    <div className="space-y-5">
                      {samples.map((s, i) => (
                        <div key={i}>
                          <p className="text-[10.5px] font-bold uppercase tracking-widest text-(--ws-faint) mb-2">{t('problemSolve.groupLabel', { index: i + 1 })}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="relative rounded-lg border border-(--ws-border) bg-(--ws-editor) overflow-hidden group">
                              <textarea
                                value={s.input}
                                onChange={(e) => setSamples(samples.map((x, j) => (j === i ? { ...x, input: e.target.value } : x)))}
                                spellCheck={false}
                                wrap="off"
                                // test của đề SQL (JSON {headers, rows}) chỉ để xem, không cho sửa
                                readOnly={sqlJsonToTables(s.input) !== null}
                                rows={Math.min(12, Math.max(3, s.input.split('\n').length))}
                                className="block w-full px-3 py-2.5 bg-transparent font-mono text-[12.5px] leading-5 resize-none outline-none whitespace-pre overflow-auto text-(--ws-text)"
                              />
                              <button
                                id={`copy-in-${i}`}
                                onClick={() => copyText(s.input, `copy-in-${i}`)}
                                className="absolute top-2 right-2 p-1.5 rounded-md bg-(--ws-panel2) text-(--ws-muted) opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                            <div className="relative rounded-lg border border-(--ws-border) bg-(--ws-editor) overflow-hidden group">
                              <pre className="px-3 py-2.5 font-mono text-[12.5px] leading-5 whitespace-pre overflow-x-auto max-h-60 overflow-y-auto text-(--ws-text)">{displayOutput(s)}</pre>
                              <button
                                id={`copy-out-${i}`}
                                onClick={() => copyText(displayOutput(s), `copy-out-${i}`)}
                                className="absolute top-2 right-2 p-1.5 rounded-md bg-(--ws-panel2) text-(--ws-muted) opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </div>
                          {sampleOutputs[i] !== undefined && (
                            <div className={`mt-2 rounded-lg border px-3 py-2 text-[12px] font-mono ${sampleOutputs[i].ok ? 'border-(--ws-ok)/30 bg-(--ws-ok)/5' : 'border-(--ws-danger)/30 bg-(--ws-danger)/5'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${sampleOutputs[i].ok ? 'bg-(--ws-ok)/20 text-(--ws-ok)' : 'bg-(--ws-danger)/20 text-(--ws-danger)'}`}>
                                  {sampleOutputs[i].ok ? `OK${sampleOutputs[i].time !== undefined ? ` · ${sampleOutputs[i].time}ms` : ''}` : 'WRONG ANSWER'}
                                </span>
                                <span className="text-(--ws-faint) text-[11px]">{t('problemSolve.actualResult')}</span>
                              </div>
                              <pre className="whitespace-pre-wrap break-all text-(--ws-text) leading-5">{sampleOutputs[i].actual || t('problemSolve.noOutput')}</pre>
                            </div>
                          )}
                        </div>
                      ))}
                      <p className="text-[11.5px] italic text-(--ws-faint)">
                        {t('problemSolve.runSamplesHint')}
                      </p>
                    </div>
                  )}

                  {bottomTab === 'console' && (
                    <div className="font-mono text-[12.5px] leading-6 space-y-0.5">
                      {consoleLines.length === 0 && <p className="text-(--ws-faint)">{t('problemSolve.consoleEmpty')}</p>}
                      {consoleLines.map((l, i) => (
                        <p key={i} className="animate-slide-up">
                          <span className="text-(--ws-faint) mr-2">[{l.time}]</span>
                          <span className={l.kind === 'ok' ? 'text-(--ws-ok)' : l.kind === 'err' ? 'text-(--ws-danger)' : l.kind === 'sys' ? 'text-(--ws-accent)' : 'text-(--ws-text)'}>
                            {l.msg}
                          </span>
                        </p>
                      ))}
                      {(running || judging) && <span className="inline-block w-2 h-4 bg-(--ws-accent) animate-pulse-dot align-middle" />}
                    </div>
                  )}

                  {bottomTab === 'results' && (
                    <div>
                      {testVerdicts.length === 0 ? (
                        <p className="text-(--ws-faint) text-[13px]">{t('problemSolve.noResultYet')}</p>
                      ) : (
                        <>
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-4 font-bold text-[13px] ${
                            finalVerdict === 'AC' ? 'bg-(--ws-accent-soft) text-(--ws-ok)' : 'bg-red-500/10 text-(--ws-danger)'
                          }`}>
                            {finalVerdict === 'AC' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                            {finalVerdict === 'AC' ? t('problemSolve.acceptedLabel', { points: detail.points }) : finalVerdict === 'TLE' ? t('problemSolve.verdictTLE') : t('problemSolve.verdictWA')}
                          </div>
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                            {testVerdicts.map((tv) => (
                              <div
                                key={tv.id}
                                title={`Test ${tv.id}: ${tv.status} • ${tv.time}ms • ${tv.memory}MB`}
                                className={`rounded-lg border px-2 py-2 text-center transition-transform hover:scale-105 ${
                                  tv.status === 'AC'
                                    ? 'border-(--ws-ok)/40 bg-(--ws-ok)/10 text-(--ws-ok)'
                                    : 'border-(--ws-danger)/40 bg-(--ws-danger)/10 text-(--ws-danger)'
                                }`}
                              >
                                <p className="text-[10px] font-bold">#{tv.id}</p>
                                <p className="text-[13px] font-extrabold">{tv.status}</p>
                                <p className="text-[9.5px] opacity-75">{tv.time}ms</p>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {bottomTab === 'debug' && (
                    <div className="text-[13px] text-(--ws-muted) space-y-2">
                      <p className="flex items-center gap-2 text-(--ws-text) font-semibold"><Bug size={14} /> {t('problemSolve.debuggerTitle')}</p>
                      <p>{t('problemSolve.noExceptions')}</p>
                      <p className="text-[12px] text-(--ws-faint)">{t('problemSolve.debugHint')}</p>
                    </div>
                  )}
                </div>}
              </div>
              </section>
            )}
          </div>

          {showAssistant && (
            <aside className="hidden lg:flex w-[360px] border-l border-(--ws-border) bg-(--ws-panel) flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-(--ws-border) bg-(--ws-panel2)">
                <div className="flex items-center gap-2">
                  <MessageCircle size={15} className="text-(--ws-accent)" />
                  <div>
                    <p className="text-[13px] font-semibold text-(--ws-text)">AI Assistant</p>
                    <p className="text-[11px] text-(--ws-faint)">{t('problemSolve.assistantSubtitle')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAssistant(false)}
                  className="rounded-lg p-1.5 text-(--ws-muted) hover:bg-(--ws-panel) hover:text-(--ws-text)"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto ws-editor-scroll p-3 space-y-2 bg-(--ws-bg)">
                {assistantMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-[13px] leading-6 ${msg.role === 'user' ? 'bg-(--ws-accent) text-[#062a25]' : 'bg-(--ws-panel) text-(--ws-text) border border-(--ws-border)'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {assistantBusy && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl border border-(--ws-border) bg-(--ws-panel) px-3 py-2 text-[13px] text-(--ws-muted)">
                      {t('problemSolve.thinking')}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={askAssistant} className="border-t border-(--ws-border) bg-(--ws-panel) p-3">
                <div className="flex items-center gap-2 rounded-xl border border-(--ws-border) bg-(--ws-editor) px-3 py-2">
                  <input
                    value={assistantInput}
                    onChange={(e) => setAssistantInput(e.target.value)}
                    placeholder={t('problemSolve.askPlaceholder')}
                    className="flex-1 bg-transparent text-[13px] text-(--ws-text) outline-none placeholder:text-(--ws-faint)"
                  />
                  <button type="submit" disabled={assistantBusy || !assistantInput.trim()} className="rounded-lg bg-(--ws-accent) p-2 text-[#062a25] disabled:opacity-50">
                    <Send size={14} />
                  </button>
                </div>
              </form>
            </aside>
          )}
        </div>

      <button
        onClick={() => setShowAssistantMobile(true)}
        className="fixed bottom-4 right-4 z-85 flex lg:hidden items-center gap-2 rounded-full bg-[#193a2b] px-4 py-3 text-[13px] font-semibold text-white shadow-xl transition-transform hover:scale-105 hover:bg-[#122c26]"
      >
        <MessageCircle size={16} />
        {t('problemSolve.aiAssistantTitle')}
      </button>

      {showAssistantMobile && (
        <div className="fixed inset-0 z-90 bg-black/55 backdrop-blur-[2px] lg:hidden" onClick={() => setShowAssistantMobile(false)}>
          <div className="absolute bottom-0 left-0 right-0 h-[72vh] rounded-t-2xl border-t border-x border-(--ws-border) bg-(--ws-panel) flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-(--ws-border)">
              <div className="flex items-center gap-2">
                <MessageCircle size={15} className="text-(--ws-accent)" />
                <p className="text-[13px] font-semibold">Leet Coach</p>
              </div>
              <button onClick={() => setShowAssistantMobile(false)} className="rounded-lg p-1.5 text-(--ws-muted) hover:bg-(--ws-panel2) hover:text-(--ws-text)">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto ws-editor-scroll p-3 space-y-2 bg-(--ws-bg)">
              {assistantMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-[13px] leading-6 ${msg.role === 'user' ? 'bg-(--ws-accent) text-[#062a25]' : 'bg-(--ws-panel) text-(--ws-text) border border-(--ws-border)'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {assistantBusy && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-(--ws-border) bg-(--ws-panel) px-3 py-2 text-[13px] text-(--ws-muted)">
                    {t('problemSolve.thinking')}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={askAssistant} className="border-t border-(--ws-border) bg-(--ws-panel) p-3">
              <div className="flex items-center gap-2 rounded-xl border border-(--ws-border) bg-(--ws-editor) px-3 py-2">
                <input
                  value={assistantInput}
                  onChange={(e) => setAssistantInput(e.target.value)}
                  placeholder={t('problemSolve.askPlaceholder')}
                  className="flex-1 bg-transparent text-[13px] text-(--ws-text) outline-none placeholder:text-(--ws-faint)"
                />
                <button type="submit" disabled={assistantBusy || !assistantInput.trim()} className="rounded-lg bg-(--ws-accent) p-2 text-[#062a25] disabled:opacity-50">
                  <Send size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ GUIDE MODAL ============ */}
      {showGuide && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-90 flex items-center justify-center p-4" onClick={() => setShowGuide(false)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--ws-border)">
              <h3 className="flex items-center gap-2.5 text-[18px] font-extrabold tracking-tight text-(--ws-text)">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--ws-accent-soft) text-(--ws-accent)">
                  <HelpCircle size={17} />
                </span>
                {t('problemSolve.usageGuide')}
              </h3>
              <button onClick={() => setShowGuide(false)} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3 text-[13.5px] leading-6 text-(--ws-muted)">
              {[
                // trong kỳ thi bỏ dòng ⌘K (tìm kiếm) và "Tải lên / Dán vào"
                ...(contestId ? [] : [['⌘K', t('problemSolve.guideSearch')]]),
                [t('problemSolve.runBtn'), t('problemSolve.guideRun')],
                [t('problemSolve.submitBtn'), t('problemSolve.guideSubmit')],
                [t('problemSolve.resetCode'), t('problemSolve.guideReset')],
                ...(contestId ? [] : [[t('problemSolve.guideUploadPasteLabel'), t('problemSolve.guideUploadPaste')]]),
                [t('problemSolve.guideModeLabel'), t('problemSolve.guideMode')],
              ].map(([k, v], i) => (
                <div key={i} className="flex gap-3">
                  <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 h-fit rounded-md bg-(--ws-accent-soft) text-(--ws-accent)">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ============ UPLOAD PREVIEW MODAL ============ */}
      {uploadPreview && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-90 flex items-center justify-center p-4" onClick={() => setUploadPreview(null)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--ws-border)">
              <div>
                <h3 className="font-bold text-[15px] text-(--ws-text)">{t('problemSolve.uploadPreviewTitle')}</h3>
                <p className="text-xs text-(--ws-muted) mt-0.5">{uploadPreview.fileName}</p>
              </div>
              <button onClick={() => setUploadPreview(null)} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={18} /></button>
            </div>
            <div className="p-6 flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-auto ws-editor-scroll rounded-xl border border-(--ws-border) bg-(--ws-editor)">
                <div className="flex font-mono text-[13px] leading-6">
                  <div className="shrink-0 w-12 py-3 pr-3 text-right select-none text-(--ws-gutter)" aria-hidden>
                    {uploadPreview.content.split('\n').map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  <pre
                    className="flex-1 m-0 py-3 pr-4 whitespace-pre text-(--ws-text)"
                    dangerouslySetInnerHTML={{ __html: highlight(uploadPreview.content, lang) }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-(--ws-border)">
              <button
                type="button"
                onClick={() => setUploadPreview(null)}
                className="px-5 py-2.5 bg-(--ws-panel2) border border-(--ws-border) text-(--ws-muted) text-xs font-semibold rounded-xl hover:bg-(--ws-hover) transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmUploadPreview}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-(--ws-panel2) border border-(--ws-border) text-(--ws-accent) text-xs font-semibold rounded-xl hover:bg-(--ws-hover) transition-colors"
              >
                <ClipboardPaste size={13} /> {t('problemSolve.uploadPreviewConfirm')}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
