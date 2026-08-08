"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import styles from "./register-modal.module.css";

interface PasswordChecks {
  length: boolean;
  lower: boolean;
  upper: boolean;
  digit: boolean;
  special: boolean;
}

function checkPassword(password: string): PasswordChecks {
  return {
    length: password.length >= 8 && password.length <= 128,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    digit: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

function generatePassword(): string {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = lower.toUpperCase();
  const digits = "0123456789";
  const special = "!@#$%^&*";
  const all = lower + upper + digits + special;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];

  let pwd = pick(lower) + pick(upper) + pick(digits) + pick(special);
  for (let i = 0; i < 8; i++) pwd += pick(all);
  return pwd
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export function RegisterModal({
  onClose,
  onSwitchToLogin,
}: {
  onClose: () => void;
  onSwitchToLogin: () => void;
}) {
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  const checks = checkPassword(password);

  function handleGenerate() {
    setPassword(generatePassword());
    setShowPassword(true);
  }

  function handleCopy() {
    if (password) navigator.clipboard.writeText(password);
  }

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

    const success = register(username.trim(), email.trim(), password, fullName.trim());
    if (!success) {
      setError("Vui lòng nhập đầy đủ thông tin bắt buộc.");
    }
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Đăng ký tài khoản"
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

        <h2 className={styles.title}>Đăng ký tài khoản</h2>

        <form onSubmit={handleSubmit}>
          <div className={styles.columns}>
            {/* Cột trái */}
            <div className={styles.column}>
              <label className={styles.field}>
                <span className={styles.label}>Họ tên (tùy chọn)</span>
                <input
                  type="text"
                  name="fullName"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>
                  Tên đăng nhập <span className={styles.required}>*</span>
                </span>
                <input
                  type="text"
                  name="username"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>
                  Email <span className={styles.required}>*</span>
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>MSSV (tùy chọn)</span>
                <input
                  type="text"
                  name="studentId"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                />
              </label>
            </div>

            {/* Cột phải */}
            <div className={styles.column}>
              <div className={styles.field}>
                <span className={styles.label}>
                  Mật khẩu <span className={styles.required}>*</span>
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
                  <div className={styles.passwordIcons}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                    <span className={styles.iconDivider} />
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={handleGenerate}
                      aria-label="Tạo mật khẩu mạnh"
                      title="Tạo mật khẩu mạnh"
                    >
                      <WandIcon />
                    </button>
                    <span className={styles.iconDivider} />
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={handleCopy}
                      aria-label="Sao chép mật khẩu"
                      title="Sao chép mật khẩu"
                    >
                      <CopyIcon />
                    </button>
                  </div>
                </div>

                <div className={styles.checklist}>
                  <CheckItem active={checks.length}>8–128 ký tự</CheckItem>
                  <CheckItem active={checks.lower}>Có chữ thường</CheckItem>
                  <CheckItem active={checks.upper}>Có chữ hoa</CheckItem>
                  <CheckItem active={checks.digit}>Có chữ số</CheckItem>
                  <CheckItem active={checks.special}>
                    Có ký tự đặc biệt (khuyến khích)
                  </CheckItem>
                </div>
              </div>

              <label className={styles.field}>
                <span className={styles.label}>
                  Xác nhận mật khẩu <span className={styles.required}>*</span>
                </span>
                <div className={styles.passwordFieldWrap}>
                  <input
                    type={showConfirm ? "text" : "password"}
                    name="confirmPassword"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <div className={styles.passwordIcons}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      <EyeIcon open={showConfirm} />
                    </button>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {error ? <p className={styles.errorMessage}>{error}</p> : null}

          <div className={styles.footer}>
            <button type="button" className={styles.backLink} onClick={onSwitchToLogin}>
              Quay lại đăng nhập
            </button>
            <button type="submit" className={styles.submitBtn}>
              Đăng ký
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CheckItem({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`${styles.checkItem} ${active ? styles.checkItemActive : ""}`}
    >
      {active ? <CheckCircleIcon /> : <CircleIcon />}
      {children}
    </span>
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

function WandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20l9-9M14.5 3.5l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5zM19 12l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
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
