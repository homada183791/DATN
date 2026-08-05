"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./login-modal.module.css";
import { useAuth } from "@/lib/auth/auth-context";

export function LoginModal({
  onClose,
  onSwitchToRegister,
  onSwitchToForgotPassword,
}: {
  onClose: () => void;
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // TODO: thay toàn bộ khối này bằng POST /api/auth/login { identifier, password }
    // khi backend sẵn sàng, rồi login() với user thật trả về từ API.
    // Mock tạm để xem trước giao diện theo vai trò: gõ email/tên đăng nhập
    // có chứa "instructor" sẽ được coi là giảng viên, còn lại là sinh viên.
    const identifier = String(new FormData(e.currentTarget).get("identifier") ?? "");
    const role = identifier.toLowerCase().includes("instructor") ? "instructor" : "student";
    login({
      id: "mock-user",
      name: role === "instructor" ? "Instructor One" : "Student One",
      email: identifier,
      role,
    });
    onClose();

    // Giảng viên vào thẳng Bảng điều khiển, giống hành vi thật khi đăng nhập.
    // Sinh viên ở lại trang hiện tại vì trang "/" vốn đã là màn hình của sinh viên.
    if (role === "instructor") {
      router.push("/instructor/dashboard");
    }
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Đăng nhập"
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

        <h2 className={styles.title}>Đăng nhập</h2>
        <p className={styles.subtitle}>Hệ thống chấm bài lập trình trực tuyến.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>
              Tên đăng nhập hoặc email <span className={styles.required}>*</span>
            </span>
            <input type="text" name="identifier" required autoComplete="username" />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>
              Mật khẩu <span className={styles.required}>*</span>
            </span>
            <div className={styles.passwordWrap}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                autoComplete="current-password"
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
          </label>

          <button type="submit" className={styles.submitBtn}>
            Đăng nhập
          </button>

          <div className={styles.linkRow}>
            <span className={styles.linkRowText}>
              Chưa có tài khoản?{" "}
              <button
                type="button"
                className={styles.link}
                onClick={onSwitchToRegister}
              >
                Đăng ký
              </button>
            </span>
            <button
              type="button"
              className={styles.link}
              onClick={onSwitchToForgotPassword}
            >
              Quên mật khẩu?
            </button>
          </div>
        </form>

        <div className={styles.divider}>
          <span>Hoặc tiếp tục với</span>
        </div>

        <button type="button" className={styles.ssoBtn}>
          <GoogleIcon />
          Đăng nhập bằng Google
        </button>
        <button type="button" className={styles.ssoBtn}>
          <MicrosoftIcon />
          Đăng nhập với Microsoft
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

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.6 6 29.6 4 24 4c-7.5 0-14 4.2-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35.4 27 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.9 39.7 16.4 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.5l6.6 5.4C41.4 35.9 44 30.3 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 23 23">
      <rect x="1" y="1" width="10" height="10" fill="#F35325" />
      <rect x="12" y="1" width="10" height="10" fill="#81BC06" />
      <rect x="1" y="12" width="10" height="10" fill="#05A6F0" />
      <rect x="12" y="12" width="10" height="10" fill="#FFBA08" />
    </svg>
  );
}
