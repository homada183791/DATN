"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import styles from "./forgot-password-modal.module.css";

interface PasswordChecks {
  length: boolean;
  lower: boolean;
  upper: boolean;
  digit: boolean;
}

function checkPassword(password: string): PasswordChecks {
  return {
    length: password.length >= 6 && password.length <= 128,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    digit: /[0-9]/.test(password),
  };
}

/**
 * Màn hình 3/3 của luồng quên mật khẩu: nhập mật khẩu mới và xác nhận.
 */
export function ForgotPasswordNewPasswordModal({
  email,
  code,
  token,
  onClose,
  onSuccess,
}: {
  email: string;
  code: string;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { resetPassword } = useAuth();
  const { showToast } = useToast();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const checks = checkPassword(password);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (!checks.length || !checks.lower || !checks.upper || !checks.digit) {
      setError("Mật khẩu chưa đáp ứng đủ điều kiện tối thiểu.");
      return;
    }

    setSubmitting(true);
    resetPassword(email, code, token, password).then((result) => {
      setSubmitting(false);

      if (!result.ok) {
        const message = result.message ?? "Không thể đặt lại mật khẩu lúc này.";
        setError(message);
        showToast(message, "error");
        return;
      }

      showToast("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.", "success");
      onSuccess();
    });
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Đặt lại mật khẩu"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
          <CloseIcon />
        </button>

        <h2 className={styles.title}>Đặt lại mật khẩu</h2>
        <p className={styles.subtitle}>Nhập mật khẩu mới cho tài khoản của bạn.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>
              Mật khẩu mới <span className={styles.required}>*</span>
            </span>
            <div className={styles.passwordFieldWrap}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>

            <div className={styles.checklist}>
              <CheckItem active={checks.length}>6–128 ký tự</CheckItem>
              <CheckItem active={checks.lower}>Có chữ thường</CheckItem>
              <CheckItem active={checks.upper}>Có chữ hoa</CheckItem>
              <CheckItem active={checks.digit}>Có chữ số</CheckItem>
            </div>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>
              Xác nhận mật khẩu <span className={styles.required}>*</span>
            </span>
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>

          {error ? <p className={styles.errorMessage}>{error}</p> : null}

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? "Đang xử lý..." : "Đổi mật khẩu"}
          </button>
        </form>
      </div>
    </div>
  );
}

function CheckItem({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span className={`${styles.checkItem} ${active ? styles.checkItemActive : ""}`}>
      {active ? <CheckCircleIcon /> : <CircleIcon />}
      {children}
    </span>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A9.8 9.8 0 0112 5c5 0 9 4 10 7a11.3 11.3 0 01-3.1 4.2M6.6 6.6C4.5 8 3 10 2 12c1 3 5 7 10 7 1.2 0 2.3-.2 3.4-.6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M2 12c1-3 5-7 10-7s9 4 10 7c-1 3-5 7-10 7s-9-4-10-7z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CircleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 12.5l2.5 2.5L16 9.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
