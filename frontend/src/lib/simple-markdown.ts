// Bộ chuyển Markdown -> HTML rút gọn, đủ dùng cho khung "Xem trước trực tiếp".
// Hỗ trợ: heading (#, ##, ###), in đậm, in nghiêng, code inline, code block,
// link, danh sách gạch đầu dòng, đoạn văn. Không nhằm thay thế trình phân
// tích Markdown đầy đủ (CommonMark) — chỉ phục vụ xem trước nhanh trong lúc
// soạn đề.

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineFormat(text: string): string {
  let out = escapeHtml(text);
  // code inline `code`
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  // in đậm **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // in nghiêng *text*
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  // link [text](url)
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  return out;
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const htmlParts: string[] = [];

  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let listBuffer: string[] = [];

  function flushList() {
    if (listBuffer.length > 0) {
      htmlParts.push(
        `<ul>${listBuffer.map((item) => `<li>${inlineFormat(item)}</li>`).join("")}</ul>`
      );
      listBuffer = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine;

    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        htmlParts.push(`<pre><code>${escapeHtml(codeBlockLines.join("\n"))}</code></pre>`);
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      htmlParts.push(`<h${level}>${inlineFormat(headingMatch[2])}</h${level}>`);
      continue;
    }

    const listMatch = /^[-*]\s+(.*)$/.exec(line);
    if (listMatch) {
      listBuffer.push(listMatch[1]);
      continue;
    }

    flushList();

    if (line.trim() === "") {
      continue;
    }

    htmlParts.push(`<p>${inlineFormat(line)}</p>`);
  }

  flushList();
  if (inCodeBlock && codeBlockLines.length > 0) {
    htmlParts.push(`<pre><code>${escapeHtml(codeBlockLines.join("\n"))}</code></pre>`);
  }

  return htmlParts.join("\n");
}