"use client";

import styles from "./problem-import-modal.module.css";

interface ProblemImportModalProps {
  open: boolean;
  onClose: () => void;
}

export function ProblemImportModal({
  open,
  onClose,
}: ProblemImportModalProps) {
  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      onClick={onClose}
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2>Import bài tập</h2>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className={styles.steps}>
          <div className={styles.stepActive}>
            <span>1</span>
            <p>Tải lên</p>
          </div>

          <div className={styles.stepLine} />

          <div className={styles.stepInactive}>
            <span>2</span>
            <p>Xem trước</p>
          </div>
        </div>

        <button
          type="button"
          className={styles.templateBtn}
        >
          Tải template metadata.yaml
        </button>

        <div className={styles.uploadBox}>
          <UploadIcon />

          <h3>Kéo thả hoặc click để chọn file ZIP</h3>

          <p>
            Chấp nhận mọi file .zip
            (không phân biệt tên/hậu tố)
          </p>
        </div>
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M8 3h8l1 3h3v3l-2 8H6L4 9V6h3l1-3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8 10h8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
