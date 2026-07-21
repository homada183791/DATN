// ====== Chế độ chạy bằng Docker (C++ / Python) ======
const LANG_META = {
  python: { fileName: "main.py", cmName: "python" },
  cpp: { fileName: "main.cpp", cmName: "text/x-c++src" },
};

let runtimeVersions = null; // { python: "docker", cpp: "docker" }

async function loadRuntimeVersions() {
  runtimeVersions = {
    python: "docker",
    cpp: "docker",
  };
}

async function remoteExecute(language, code, stdin) {
  const response = await fetch("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language, code, stdin }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Máy chủ Docker không phản hồi.");
  }

  return response.json();
}

// ====== State ======
let currentProblem = null;
let currentLang = "cpp";
let editor = null; // CodeMirror instance, hoặc null nếu dùng textarea fallback
const codeStore = {}; // key `${problemId}:${lang}` -> code người dùng đang viết (chỉ lưu trong phiên làm việc)

function storeKey(problemId, lang) {
  return `${problemId}:${lang}`;
}

// ====== Mini markdown renderer (chỉ đủ cho mô tả đề bài) ======
function renderMarkdown(md) {
  let html = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre class="code-block">${code.trim()}</pre>`);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.split(/\n{2,}/).map((p) => (p.startsWith("<pre") ? p : `<p>${p.replace(/\n/g, "<br>")}</p>`)).join("");
  return html;
}

// ====== Render danh sách bài ======
function renderProblemList() {
  const container = document.getElementById("problem-items");
  document.getElementById("problem-count").textContent = PROBLEMS.length;
  container.innerHTML = "";
  PROBLEMS.forEach((p) => {
    const el = document.createElement("div");
    el.className = "problem-item";
    el.dataset.id = p.id;
    el.innerHTML = `
      <span class="problem-item-title">${p.id}. ${p.title}</span>
      <span class="diff-pill diff-${p.difficulty.toLowerCase()}">${p.difficulty}</span>
    `;
    el.addEventListener("click", () => selectProblem(p.id));
    container.appendChild(el);
  });
}

// ====== Chọn 1 bài ======
function selectProblem(id) {
  if (currentProblem) saveCurrentEditorToStore();

  const p = PROBLEMS.find((x) => x.id === id);
  if (!p) return;
  currentProblem = p;

  document.querySelectorAll(".problem-item").forEach((el) => {
    el.classList.toggle("active", Number(el.dataset.id) === id);
  });

  document.getElementById("desc-title").textContent = `${p.id}. ${p.title}`;
  document.getElementById("desc-meta").innerHTML = `
    <span class="diff-pill diff-${p.difficulty.toLowerCase()}">${p.difficulty}</span>
    ${p.tags.map((t) => `<span class="tag-pill">${t}</span>`).join("")}
  `;
  document.getElementById("desc-body").innerHTML =
    renderMarkdown(p.description) +
    `<p class="io-note"><strong>Input:</strong> ${p.io.inputFormat}<br><strong>Output:</strong> ${p.io.outputFormat}</p>`;

  loadEditorForCurrent();
  resetConsole();
}

function loadEditorForCurrent() {
  const key = storeKey(currentProblem.id, currentLang);
  const code = codeStore[key] || currentProblem.starterCode[currentLang];
  setEditorMode(currentLang);
  setEditorValue(code);
}

function saveCurrentEditorToStore() {
  if (!currentProblem) return;
  const key = storeKey(currentProblem.id, currentLang);
  codeStore[key] = getEditorValue();
}

// ====== Editor setup (CodeMirror nếu load được, ngược lại textarea) ======
function initEditor() {
  const host = document.getElementById("editor-host");
  if (window.CodeMirror) {
    editor = CodeMirror(host, {
      value: "// Chọn một bài ở cột bên trái để bắt đầu",
      mode: "javascript",
      theme: "dracula",
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
      autofocus: false,
      matchBrackets: true,
    });
  } else {
    const ta = document.createElement("textarea");
    ta.className = "fallback-textarea";
    ta.spellcheck = false;
    host.appendChild(ta);
    editor = { fallbackEl: ta };
  }
}

function getEditorValue() {
  return editor.fallbackEl ? editor.fallbackEl.value : editor.getValue();
}

function setEditorValue(code) {
  if (!editor) return;
  if (editor.fallbackEl) editor.fallbackEl.value = code;
  else editor.setValue(code);
}

function setEditorMode(lang) {
  if (!editor || editor.fallbackEl) return;
  editor.setOption("mode", LANG_META[lang].cmName);
}

// ====== Console (khu vực kết quả) ======
function resetConsole() {
  setStatus("", "");
  document.getElementById("console-body").innerHTML =
    `<div class="console-empty">Nhấn <strong>Run</strong> để chạy thử, hoặc <strong>Submit</strong> để chạy toàn bộ test case.</div>`;
}

function setStatus(text, cls) {
  const el = document.getElementById("console-status");
  el.textContent = text;
  el.className = "console-status " + (cls || "");
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderCompileError(message) {
  document.getElementById("console-body").innerHTML = `
    <div class="test-card fail">
      <div class="test-card-head">✘ Lỗi biên dịch / chạy chương trình</div>
      <div class="test-card-body"><pre class="err-pre">${escapeHtml(message)}</pre></div>
    </div>`;
}

function renderTestResults(results) {
  const body = document.getElementById("console-body");
  body.innerHTML = "";
  results.forEach((r, i) => {
    const card = document.createElement("div");
    card.className = "test-card " + (r.pass ? "pass" : "fail");
    card.innerHTML = `
      <div class="test-card-head">${r.pass ? "✔" : "✘"} Test case ${i + 1}</div>
      <div class="test-card-body">
        <div><span class="k">Input:</span><pre class="io-pre">${escapeHtml(r.input)}</pre></div>
        <div><span class="k">Expected:</span> <code>${escapeHtml(r.expected)}</code></div>
        <div><span class="k">Output:</span> <code>${escapeHtml(r.actual)}</code></div>
        ${r.stderr ? `<div class="err"><span class="k">Stderr:</span><pre class="err-pre">${escapeHtml(r.stderr)}</pre></div>` : ""}
      </div>`;
    body.appendChild(card);
  });
}

// ====== Chạy toàn bộ test case tuần tự qua Piston ======
async function executeCurrentCode(testCases) {
  if (!currentProblem) return;

  if (!runtimeVersions) {
    setStatus("Đang khởi tạo runtime...", "running");
    await loadRuntimeVersions();
  }
  if (!runtimeVersions || !runtimeVersions[currentLang]) {
    setStatus("Không hỗ trợ", "fail");
    renderCompileError(
      "Ngôn ngữ này chưa được hỗ trợ. Hãy chọn C++ hoặc Python."
    );
    return;
  }

  setStatus(`Đang chạy (0/${testCases.length})...`, "running");
  document.getElementById("console-body").innerHTML = `<div class="console-empty">Đang chạy code...</div>`;

  const code = getEditorValue();
  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    setStatus(`Đang chạy (${i + 1}/${testCases.length})...`, "running");
    let data;
    try {
      data = await remoteExecute(currentLang, code, tc.input);
    } catch (err) {
      setStatus("Lỗi", "fail");
      renderCompileError(err.message);
      return;
    }

    if (data.compile && data.compile.code !== 0) {
      setStatus("Lỗi biên dịch", "fail");
      renderCompileError(data.compile.stderr || data.compile.output || "Biên dịch thất bại.");
      return;
    }

    const run = data.run || {};
    const actual = (run.stdout || "").trim();
    const expected = tc.expected.trim();
    const pass = actual === expected;
    results.push({
      pass,
      input: tc.input,
      expected: tc.expected,
      actual: actual,
      stderr: run.code !== 0 ? run.stderr : "",
    });
  }

  const passCount = results.filter((r) => r.pass).length;
  setStatus(`${passCount}/${results.length} test passed`, passCount === results.length ? "pass" : "fail");
  renderTestResults(results);
}

// ====== Buttons & language selector ======
function initButtons() {
  document.getElementById("btn-run").addEventListener("click", () => {
    if (!currentProblem) return;
    const sample = currentProblem.testCases.slice(0, Math.min(3, currentProblem.testCases.length));
    executeCurrentCode(sample);
  });

  document.getElementById("btn-submit").addEventListener("click", () => {
    if (!currentProblem) return;
    executeCurrentCode(currentProblem.testCases);
  });

  document.getElementById("btn-reset").addEventListener("click", () => {
    if (!currentProblem) return;
    const key = storeKey(currentProblem.id, currentLang);
    delete codeStore[key];
    setEditorValue(currentProblem.starterCode[currentLang]);
  });

  document.getElementById("lang-select").addEventListener("change", (e) => {
    saveCurrentEditorToStore();
    currentLang = e.target.value;
    loadEditorForCurrent();
    resetConsole();
  });
}

// ====== Init ======
window.addEventListener("DOMContentLoaded", () => {
  renderProblemList();
  initEditor();
  initButtons();
  selectProblem(PROBLEMS[0].id);
  loadRuntimeVersions(); // tải trước danh sách phiên bản ngôn ngữ, không cần chờ người dùng bấm Run
});
