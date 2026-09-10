"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import styles from "./forgot-password-modal.module.css";

/**
 * Màn hình 1/3 của luồng quên mật khẩu: nhập email để nhận mã xác nhận.
 */
export function ForgotPasswordModal({
  onClose,
  onSwitchToLogin,
  onCodeSent,
}: {
  onClose: () => void;
  onSwitchToLogin: () => void;
  onCodeSent: (email: string) => void;
}) {
  const { forgotPassword } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      return;
    }

    setSubmitting(true);
    forgotPassword(email.trim()).then((result) => {
      setSubmitting(false);

      if (!result.ok) {
        const message = result.message ?? "Không thể gửi mã xác nhận lúc này.";
        setError(message);
        showToast(message, "error");
        return;
      }

      showToast("Mã xác nhận đã được gửi tới email của bạn.", "success");
      onCodeSent(email.trim());
    });
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
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
          <CloseIcon />
        </button>

        <h2 className={styles.title}>Quên mật khẩu</h2>
        <p className={styles.subtitle}>
          Nhập email đã đăng ký. Chúng tôi sẽ gửi mã xác nhận gồm 6 chữ số
          (có hiệu lực trong 10 phút).
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>
              Email <span className={styles.required}>*</span>
            </span>
            <input
              type="email"
              name="identifier"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          {error ? <p className={styles.errorMessage}>{error}</p> : null}

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? "Đang gửi..." : "Gửi mã xác nhận"}
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
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
