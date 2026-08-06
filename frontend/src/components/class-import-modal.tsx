"use client";

import { useRef, useState, type DragEvent } from "react";
import styles from "./class-import-modal.module.css";
import { useToast } from "./toast-context";

interface ClassImportModalProps {
  open: boolean;
  onClose: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ClassImportModal({ open, onClose }: ClassImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  if (!open) return null;

  function handleClose() {
    setFile(null);
    setError(null);
    setDragActive(false);
    onClose();
  }

  function pickFile(list: FileList | null) {
    const picked = list?.[0];
    if (!picked) return;
    if (!picked.name.toLowerCase().endsWith(".zip")) {
      setError("Vui lòng chọn file .zip.");
      return;
    }
    setError(null);
    setFile(picked);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    pickFile(e.dataTransfer.files);
  }

  function handleConfirm() {
    // TODO: nối API thật — POST /api/classes/import (multipart/form-data, field "file")
    // sau khi backend đọc xong file zip, hiện kết quả (số lớp học được tạo).
    showToast(`Đã chọn "${file?.name}" — chức năng import thật đang chờ nối API.`);
    handleClose();
  }

  return (
    <div className={styles.backdrop} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Import lớp học từ file ZIP</h2>
          <button type="button" className={styles.closeBtn} onClick={handleClose}>
            ×
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          hidden
          onChange={(e) => pickFile(e.target.files)}
        />

        {!file ? (
          <div
            className={`${styles.uploadBox} ${dragActive ? styles.uploadBoxActive : ""}`}
            onClick={() => inputRef.current?.click()}
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
            <h3>Kéo thả hoặc click để chọn file ZIP</h3>
            <p>Chấp nhận mọi file .zip (không phân biệt tên/hậu tố)</p>
          </div>
        ) : (
          <div className={styles.fileRow}>
            <span className={styles.fileIcon}>
              <ZipIcon />
            </span>
            <div className={styles.fileInfo}>
              <div className={styles.fileName}>{file.name}</div>
              <div className={styles.fileSize}>{formatFileSize(file.size)}</div>
            </div>
            <button
              type="button"
              className={styles.removeFileBtn}
              onClick={() => setFile(null)}
              aria-label="Bỏ chọn file"
            >
              <TrashIcon />
            </button>
          </div>
        )}

        {error && <p className={styles.errorText}>{error}</p>}

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={handleClose}>
            Hủy
          </button>
          <button
            type="button"
            className={styles.confirmBtn}
            disabled={!file}
            onClick={handleConfirm}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
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

function ZipIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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
