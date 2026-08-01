"use client";

import { useState, type FormEvent } from "react";
import styles from "./forgot-password-modal.module.css";

export function ForgotPasswordModal({
  onClose,
  onSwitchToLogin,
}: {
  onClose: () => void;
  onSwitchToLogin: () => void;
}) {
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: nối API backend
    // POST /api/auth/forgot-password { identifier }
    setSent(true);
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Quên mật khẩu"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Đóng"
        >
          <CloseIcon />
        </button>

        <h2 className={styles.title}>Quên mật khẩu</h2>
        <p className={styles.subtitle}>
          Nhập tên đăng nhập hoặc email. Chúng tôi sẽ gửi liên kết đặt lại
          mật khẩu.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>
              Tên đăng nhập hoặc email <span className={styles.required}>*</span>
            </span>
            <input type="text" name="identifier" required autoComplete="username" />
          </label>

          <button type="submit" className={styles.submitBtn}>
            {sent ? "Đã gửi liên kết" : "Gửi liên kết đặt lại"}
          </button>
        </form>

        <button type="button" className={styles.backLink} onClick={onSwitchToLogin}>
          Quay lại đăng nhập
        </button>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
