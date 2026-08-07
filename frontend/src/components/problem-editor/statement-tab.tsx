"use client";

import { useRef, useState, type DragEvent } from "react";
import styles from "./statement-tab.module.css";
import { markdownToHtml } from "@/lib/simple-markdown";
import type { ProblemFormState } from "./info-tab";

export function StatementTab({
  form,
  setForm,
}: {
  form: ProblemFormState;
  setForm: (updater: (prev: ProblemFormState) => ProblemFormState) => void;
}) {
  const [showPreview, setShowPreview] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lines = form.statementMarkdown.split("\n");
  const previewHtml = markdownToHtml(form.statementMarkdown);

  function handleScroll() {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }

  function pickPdf(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      return;
    }
    setForm((prev) => ({ ...prev, statementPdfFileName: file.name }));
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    pickPdf(e.dataTransfer.files);
  }

  return (
    <div>
      <div className={styles.toolbarRow}>
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={() => setShowPreview((v) => !v)}
        >
          {showPreview ? "Ẩn xem trước" : "Hiện xem trước"}
        </button>
      </div>

      <div className={`${styles.splitGrid} ${!showPreview ? styles.splitGridSingle : ""}`}>
        <div className={styles.col}>
          <div className={styles.colHeader}>MARKDOWN</div>
          <div className={styles.editorWrap}>
            <div className={styles.gutter} ref={gutterRef}>
              {lines.map((_, i) => (
                <div key={i} className={styles.lineNum}>
                  {i + 1}
                </div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={form.statementMarkdown}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, statementMarkdown: e.target.value }))
              }
              onScroll={handleScroll}
              spellCheck={false}
              placeholder={
                "Viết đề bài bằng Markdown...\n\n## Đề bài\nMô tả bài toán ở đây."
              }
            />
          </div>
        </div>

        {showPreview && (
          <div className={styles.col}>
            <div className={styles.colHeader}>XEM TRƯỚC TRỰC TIẾP</div>
            <div className={styles.preview}>
              {form.statementMarkdown.trim() === "" ? (
                <p className={styles.previewEmpty}>Chưa có nội dung để xem trước.</p>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              )}
            </div>
          </div>
        )}
      </div>

      <div className={styles.pdfCard}>
        <h3 className={styles.pdfTitle}>PDF</h3>
        <p className={styles.pdfSubtitle}>Kéo thả hoặc chọn file PDF đề bài (tối đa 20MB)</p>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => pickPdf(e.target.files)}
        />

        {!form.statementPdfFileName ? (
          <div
            className={`${styles.uploadBox} ${dragActive ? styles.uploadBoxActive : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
          >
            <UploadIcon />
            <p>Chọn file PDF</p>
          </div>
        ) : (
          <div className={styles.fileRow}>
            <span className={styles.fileIcon}>
              <PdfIcon />
            </span>
            <span className={styles.fileName}>{form.statementPdfFileName}</span>
            <button
              type="button"
              className={styles.removeFileBtn}
              onClick={() => setForm((prev) => ({ ...prev, statementPdfFileName: null }))}
              aria-label="Bỏ chọn file"
            >
              <TrashIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 3h8l1 3h3v3l-2 8H6L4 9V6h3l1-3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8 10h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 2h9l5 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7h16M9 7V4.5A1.5 1.5 0 0110.5 3h3A1.5 1.5 0 0115 4.5V7M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
