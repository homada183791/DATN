"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import styles from "./login-modal.module.css";

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};
type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};
type GoogleOAuth2Api = {
  initTokenClient: (options: {
    client_id: string;
    scope: string;
    callback: (response: GoogleTokenResponse) => void;
  }) => GoogleTokenClient;
};

declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleOAuth2Api } };
  }
}

let googleScriptPromise: Promise<void> | undefined;

function loadGoogleIdentityServices() {
  if (window.google?.accounts.oauth2) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts.oauth2) {
        resolve();
      } else {
        googleScriptPromise = undefined;
        reject(new Error("Google OAuth services did not initialize."));
      }
    };
    script.onerror = () => {
      googleScriptPromise = undefined;
      reject(new Error("Failed to load Google Identity Services."));
    };
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

export function LoginModal({
  onClose,
  onSwitchToRegister,
  onSwitchToForgotPassword,
}: {
  onClose: () => void;
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
}) {
  const { t } = useTranslation();
  const { login, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const googleTokenClientRef = useRef<GoogleTokenClient | null>(null);
  const googleHandlersRef = useRef({ loginWithGoogle, showToast, t });
  googleHandlersRef.current = { loginWithGoogle, showToast, t };
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    let active = true;
    loadGoogleIdentityServices()
      .then(() => {
        if (!active || !window.google?.accounts.oauth2) return;
        googleTokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "openid email profile",
          callback: async ({ access_token: accessToken, error, error_description }) => {
            if (!active) return;
            if (error || !accessToken) {
              googleHandlersRef.current.showToast(
                error_description ?? "Đăng nhập Google đã bị hủy hoặc thất bại.",
                "error",
              );
              return;
            }

            const handlers = googleHandlersRef.current;
            const result = await handlers.loginWithGoogle(accessToken);
            if (!active) return;
            if (!result.ok) {
              handlers.showToast(
                result.message ?? "Không thể đăng nhập bằng Google.",
                "error",
              );
              return;
            }
            handlers.showToast(handlers.t("auth.loginSuccess"), "success");
          },
        });
      })
      .catch(() => {
        if (active) {
          googleHandlersRef.current.showToast(
            "Không thể tải dịch vụ đăng nhập Google.",
            "error",
          );
        }
      });

    return () => {
      active = false;
      googleTokenClientRef.current = null;
    };
  }, []);

  function handleGoogleLogin() {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      showToast("Thiếu cấu hình VITE_GOOGLE_CLIENT_ID ở frontend.", "error");
      return;
    }
    if (!googleTokenClientRef.current || !window.google?.accounts.oauth2) {
      showToast("Dịch vụ đăng nhập Google chưa sẵn sàng. Vui lòng thử lại.", "error");
      return;
    }

    googleTokenClientRef.current.requestAccessToken({ prompt: "select_account" });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    login(identifier.trim(), password).then((result) => {
      if (!result.ok) {
        const message = result.message ?? t("auth.loginFailed");
        setError(message);
        showToast(message, "error");
        return;
      }
      showToast(t("auth.loginSuccess"), "success");
    });
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={t("auth.login")}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label={t("auth.close")}
        >
          <CloseIcon />
        </button>

        <h2 className={styles.title}>{t("auth.login")}</h2>
        <p className={styles.subtitle}>{t("auth.subtitle")}</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>
              {t("auth.usernameOrEmail")} <span className={styles.required}>*</span>
            </span>
            <input
              type="text"
              name="identifier"
              required
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>
              {t("auth.password")} <span className={styles.required}>*</span>
            </span>
            <div className={styles.passwordWrap}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </label>

          {error ? <p className={styles.errorMessage}>{error}</p> : null}

          <button type="submit" className={styles.submitBtn}>
            {t("auth.login")}
          </button>

          <div className={styles.linkRow}>
            <span className={styles.linkRowText}>
              {t("auth.noAccount")}{" "}
              <button
                type="button"
                className={styles.link}
                onClick={onSwitchToRegister}
              >
                {t("auth.registerName")}
              </button>
            </span>
            <button
              type="button"
              className={styles.link}
              onClick={onSwitchToForgotPassword}
            >
              {t("auth.forgotPassword")}
            </button>
          </div>
        </form>

        <div className={styles.divider}>
          <span>{t("auth.orContinue")}</span>
        </div>

        <button
          type="button"
          className={styles.ssoBtn}
          onClick={handleGoogleLogin}
        >
          <GoogleIcon />
          {t("auth.googleLogin")}
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
