import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import Editor, { loader, type OnMount } from '@monaco-editor/react';
// Chỉ nạp lõi soạn thảo + các tính năng cần dùng + ngôn ngữ judge hỗ trợ, để app (đóng gói 1 file) không phình quá to.
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/editor/browser/coreCommands';
import 'monaco-editor/esm/vs/editor/browser/widget/codeEditor/codeEditorContributions';
import 'monaco-editor/esm/vs/editor/contrib/find/browser/findController';
import 'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController';
import 'monaco-editor/esm/vs/editor/contrib/hover/browser/hoverContribution';
import 'monaco-editor/esm/vs/editor/contrib/folding/browser/folding';
import 'monaco-editor/esm/vs/editor/contrib/bracketMatching/browser/bracketMatching';
import 'monaco-editor/esm/vs/editor/contrib/wordHighlighter/browser/wordHighlighter';
import 'monaco-editor/esm/vs/editor/contrib/linesOperations/browser/linesOperations';
import 'monaco-editor/esm/vs/editor/contrib/comment/browser/comment';
import 'monaco-editor/esm/vs/editor/contrib/multicursor/browser/multicursor';
import 'monaco-editor/esm/vs/editor/contrib/clipboard/browser/clipboard';
import 'monaco-editor/esm/vs/editor/contrib/contextmenu/browser/contextmenu';
import 'monaco-editor/esm/vs/editor/contrib/gotoError/browser/gotoError';
import 'monaco-editor/esm/vs/editor/contrib/cursorUndo/browser/cursorUndo';
import 'monaco-editor/esm/vs/editor/contrib/indentation/browser/indentation';
import 'monaco-editor/esm/vs/editor/contrib/wordOperations/browser/wordOperations';
import 'monaco-editor/esm/vs/editor/contrib/smartSelect/browser/smartSelect';
import 'monaco-editor/esm/vs/editor/contrib/caretOperations/browser/caretOperations';
import 'monaco-editor/esm/vs/editor/contrib/parameterHints/browser/parameterHints';
import 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution';
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution';
import 'monaco-editor/esm/vs/basic-languages/java/java.contribution';
import 'monaco-editor/esm/vs/basic-languages/go/go.contribution';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import type { Diagnostic } from '../utils/compilerDiagnostics';

// Dùng bản monaco đóng gói cùng app thay vì tải từ CDN (máy thi có thể không ra được Internet).
(self as unknown as { MonacoEnvironment: monaco.Environment }).MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};
loader.config({ monaco });

type Monaco = typeof monaco;
type IEditor = monaco.editor.IStandaloneCodeEditor;

export interface CodeEditorHandle {
  /** Đưa con trỏ tới lỗi, cuộn tới giữa màn hình, hiện mũi tên chỉ vào chỗ lỗi. */
  revealDiagnostic: (d: Diagnostic) => void;
  focus: () => void;
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Mã ngôn ngữ trong config/languages.ts: cpp, c, python, java, go, javascript. */
  language: string;
  fontSize: number;
  wordWrap: boolean;
  diagnostics: Diagnostic[];
  /** Bật/tắt gợi ý code khi gõ (công tắc IntelliSense). */
  suggestions?: boolean;
  ariaLabel?: string;
}

const MARKER_OWNER = 'judgehub-compiler';
const THEME_NAME = 'judgehub';

function toMonacoLang(lang: string) {
  if (lang === 'c') return 'cpp';
  return lang;
}

/** Đổi màu CSS bất kỳ (biến --ws-*, rgb(), color-mix) sang #rrggbb mà monaco yêu cầu. */
function cssColorToHex(color: string, fallback: string): string {
  if (!color) return fallback;
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return fallback;
  ctx.fillStyle = '#000000';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

/** Dựng theme monaco từ biến màu --ws-* và màu token .tok-* của giao diện đang chọn. */
function defineThemeFromCss(m: Monaco) {
  const root = document.documentElement;
  const css = getComputedStyle(root);
  const v = (name: string, fb: string) => cssColorToHex(css.getPropertyValue(name).trim(), fb);
  const dark = root.classList.contains('ws-dark');

  const probe = document.createElement('span');
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const tok = (cls: string, fb: string) => {
    probe.className = cls;
    return cssColorToHex(getComputedStyle(probe).color, fb).slice(1);
  };
  const kw = tok('tok-kw', dark ? '#c586c0' : '#af00db');
  const ty = tok('tok-ty', dark ? '#4ec9b0' : '#267f99');
  const str = tok('tok-str', dark ? '#ce9178' : '#a31515');
  const com = tok('tok-com', dark ? '#6a9955' : '#008000');
  const num = tok('tok-num', dark ? '#b5cea8' : '#098658');
  const pp = tok('tok-pp', dark ? '#9cdcfe' : '#0070c1');
  probe.remove();

  const bg = v('--ws-editor', dark ? '#1e1e1e' : '#ffffff');
  const text = v('--ws-text', dark ? '#d4d4d4' : '#1f1f1f');
  const accent = v('--ws-accent', '#1f5c46');
  const gutter = v('--ws-gutter', dark ? '#6e7681' : '#9aa0a6');
  const danger = v('--ws-danger', '#e5484d');
  const warn = v('--ws-warn', '#d69e2e');

  m.editor.defineTheme(THEME_NAME, {
    base: dark ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [
      { token: '', foreground: text.slice(1) },
      { token: 'keyword', foreground: kw },
      { token: 'type', foreground: ty },
      { token: 'type.identifier', foreground: ty },
      { token: 'string', foreground: str },
      { token: 'string.escape', foreground: str },
      { token: 'comment', foreground: com, fontStyle: 'italic' },
      { token: 'number', foreground: num },
      { token: 'number.float', foreground: num },
      { token: 'number.hex', foreground: num },
      { token: 'keyword.directive', foreground: pp },
      { token: 'keyword.directive.include', foreground: pp },
      { token: 'string.include.identifier', foreground: str },
      { token: 'annotation', foreground: pp },
    ],
    colors: {
      'editor.background': bg,
      'editor.foreground': text,
      'editorLineNumber.foreground': gutter,
      'editorLineNumber.activeForeground': text,
      'editorCursor.foreground': accent,
      'editor.lineHighlightBackground': `${text}0d`,
      'editor.lineHighlightBorder': '#00000000',
      'editor.selectionBackground': `${accent}40`,
      'editor.inactiveSelectionBackground': `${accent}26`,
      'editorIndentGuide.background1': `${gutter}33`,
      'editorIndentGuide.activeBackground1': `${gutter}80`,
      'editorError.foreground': danger,
      'editorWarning.foreground': warn,
      'editorOverviewRuler.errorForeground': danger,
      'editorGutter.background': bg,
      'scrollbarSlider.background': `${gutter}33`,
      'scrollbarSlider.hoverBackground': `${gutter}55`,
      'scrollbarSlider.activeBackground': `${gutter}77`,
      'editorWidget.background': bg,
      'editorHoverWidget.background': bg,
      'editorHoverWidget.border': `${gutter}55`,
    },
  });
  m.editor.setTheme(THEME_NAME);
}

function toMarkerRange(model: monaco.editor.ITextModel, d: Diagnostic) {
  const line = Math.min(Math.max(d.line, 1), model.getLineCount());
  const maxCol = model.getLineMaxColumn(line);
  const firstCol = Math.max(model.getLineFirstNonWhitespaceColumn(line), 1);
  if (!d.column) {
    // Không biết cột: gạch chân cả phần có chữ của dòng.
    return { line, start: firstCol, end: Math.max(maxCol, firstCol + 1) };
  }
  const start = Math.min(d.column, maxCol);
  let end = d.endColumn ?? 0;
  if (!end || end <= start) {
    const word = model.getWordAtPosition({ lineNumber: line, column: start });
    end = word && word.startColumn <= start ? word.endColumn : start + 1;
  }
  // gcc hay chỉ vào ngay sau ký tự cuối dòng (vd. thiếu dấu ;): lùi lại 1 ký tự để vẫn thấy gạch chân.
  if (start >= maxCol) return { line, start: Math.max(maxCol - 1, 1), end: maxCol };
  return { line, start, end: Math.min(end, maxCol) };
}

const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
  { value, onChange, language, fontSize, wordWrap, diagnostics, suggestions = true, ariaLabel },
  ref,
) {
  const editorRef = useRef<IEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const pointerRef = useRef<{ widget: monaco.editor.IContentWidget; timer: number; decorations: monaco.editor.IEditorDecorationsCollection } | null>(null);

  const clearPointer = useCallback(() => {
    const p = pointerRef.current;
    if (!p) return;
    window.clearTimeout(p.timer);
    editorRef.current?.removeContentWidget(p.widget);
    p.decorations.clear();
    pointerRef.current = null;
  }, []);

  const applyMarkers = useCallback(() => {
    const m = monacoRef.current;
    const model = editorRef.current?.getModel();
    if (!m || !model) return;
    m.editor.setModelMarkers(
      model,
      MARKER_OWNER,
      diagnostics.map((d) => {
        const r = toMarkerRange(model, d);
        return {
          severity:
            d.severity === 'error'
              ? m.MarkerSeverity.Error
              : d.severity === 'warning'
                ? m.MarkerSeverity.Warning
                : m.MarkerSeverity.Info,
          message: d.message,
          source: d.source,
          startLineNumber: r.line,
          endLineNumber: r.line,
          startColumn: r.start,
          endColumn: r.end,
        };
      }),
    );
  }, [diagnostics]);

  useEffect(() => {
    applyMarkers();
  }, [applyMarkers]);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => editorRef.current?.focus(),
      revealDiagnostic: (d: Diagnostic) => {
        const editor = editorRef.current;
        const model = editor?.getModel();
        if (!editor || !model) return;
        clearPointer();
        const r = toMarkerRange(model, d);
        editor.setSelection({ startLineNumber: r.line, startColumn: r.start, endLineNumber: r.line, endColumn: r.start });
        editor.revealPositionInCenter({ lineNumber: r.line, column: r.start });
        editor.focus();

        // "Con trỏ ảo": mũi tên đỏ nằm ngay dưới chỗ lỗi kèm nội dung lỗi, dòng lỗi nháy nền đỏ.
        const node = document.createElement('div');
        node.className = `jh-error-pointer jh-error-pointer-${d.severity}`;
        const arrow = document.createElement('span');
        arrow.className = 'jh-error-pointer-arrow';
        arrow.textContent = '▲';
        const label = document.createElement('span');
        label.className = 'jh-error-pointer-label';
        label.textContent = d.message;
        node.append(arrow, label);
        const widget: monaco.editor.IContentWidget = {
          getId: () => 'jh.errorPointer',
          getDomNode: () => node,
          getPosition: () => ({
            position: { lineNumber: r.line, column: r.start },
            preference: [
              monaco.editor.ContentWidgetPositionPreference.BELOW,
              monaco.editor.ContentWidgetPositionPreference.ABOVE,
            ],
          }),
        };
        editor.addContentWidget(widget);
        const decorations = editor.createDecorationsCollection([
          {
            range: new monaco.Range(r.line, 1, r.line, 1),
            options: {
              isWholeLine: true,
              className: `jh-error-line jh-error-line-${d.severity}`,
              glyphMarginClassName: `jh-error-glyph jh-error-glyph-${d.severity}`,
            },
          },
        ]);
        pointerRef.current = { widget, decorations, timer: window.setTimeout(clearPointer, 6000) };
      },
    }),
    [clearPointer],
  );

  const onMount: OnMount = (editor, m) => {
    editorRef.current = editor;
    monacoRef.current = m as unknown as Monaco;
    defineThemeFromCss(m as unknown as Monaco);
    applyMarkers();
    // Gõ tiếp hoặc bấm chỗ khác thì bỏ mũi tên chỉ lỗi.
    editor.onDidChangeModelContent(clearPointer);
    editor.onMouseDown(clearPointer);
  };

  // Đổi giao diện (class trên <html>) thì dựng lại theme cho khung code.
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (monacoRef.current) defineThemeFromCss(monacoRef.current);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => clearPointer, [clearPointer]);

  return (
    <Editor
      value={value}
      language={toMonacoLang(language)}
      theme={THEME_NAME}
      onChange={(v) => onChange(v ?? '')}
      onMount={onMount}
      loading={<div className="h-full w-full bg-(--ws-editor)" />}
      options={{
        fontSize,
        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
        fontLigatures: true,
        lineHeight: Math.round(fontSize * 1.6),
        wordWrap: wordWrap ? 'on' : 'off',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        insertSpaces: true,
        renderLineHighlight: 'line',
        glyphMargin: true,
        lineNumbersMinChars: 3,
        lineDecorationsWidth: 6,
        folding: true,
        padding: { top: 12, bottom: 12 },
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        bracketPairColorization: { enabled: true },
        guides: { indentation: true, bracketPairs: false },
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10, useShadows: false },
        overviewRulerBorder: false,
        fixedOverflowWidgets: true,
        ariaLabel: ariaLabel ?? 'Code editor',
        // Gợi ý từ khoá theo từ đã có trong file (không gửi code ra ngoài).
        wordBasedSuggestions: suggestions ? 'currentDocument' : 'off',
        quickSuggestions: suggestions ? { other: true, comments: false, strings: false } : false,
        suggestOnTriggerCharacters: suggestions,
        parameterHints: { enabled: suggestions },
      }}
    />
  );
});

export default CodeEditor;
