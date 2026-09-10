"use client";

import { useRef, useState, type ClipboardEvent, type FocusEvent, type FormEvent, type KeyboardEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import styles from "./forgot-password-modal.module.css";

/**
 * Màn hình 2/3 của luồng quên mật khẩu: nhập mã xác nhận 6 chữ số đã gửi qua email.
 */
export function ForgotPasswordCodeModal({
  email,
  onClose,
  onBack,
  onSwitchToLogin,
  onVerified,
}: {
  email: string;
  onClose: () => void;
  onBack: () => void;
  onSwitchToLogin: () => void;
  onVerified: (code: string, token?: string) => void;
}) {
  const { forgotPassword, verifyResetCode } = useAuth();
  const { showToast } = useToast();

  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const codeValue = code.join("");

  function focusInput(index: number) {
    // requestAnimationFrame tránh việc focus() bị tranh chấp với chu kỳ
    // cập nhật DOM của React khi setCode() vừa được gọi.
    requestAnimationFrame(() => {
      const el = codeInputRefs.current[index];
      el?.focus();
      el?.select();
    });
  }

  function handleDigitChange(index: number, rawValue: string) {
    const digits = rawValue.replace(/\D/g, "");

    if (!digits) {
      setCode((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }

    // Luôn lấy KÝ TỰ SỐ CUỐI CÙNG vừa gõ để gán cho ô hiện tại. Cách này
    // đúng trong cả hai trường hợp: (1) nội dung cũ trong ô đã được bôi
    // đen và ký tự mới thay thế hoàn toàn (value chỉ còn 1 ký tự), và
    // (2) trình duyệt không kịp bôi đen nên ký tự mới bị nối thêm vào
    // sau ký tự cũ (value có 2+ ký tự) — khi đó ký tự cuối cùng luôn
    // chính là ký tự vừa được gõ. Không rải nhiều ký tự sang các ô khác
    // ở đây (việc đó chỉ áp dụng cho sự kiện dán — xem handlePaste).
    const newDigit = digits.slice(-1);

    setCode((prev) => {
      const next = [...prev];
      next[index] = newDigit;
      return next;
    });

    focusInput(Math.min(index + 1, 5));
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      focusInput(index - 1);
    }
  }

  function handleFocus(e: FocusEvent<HTMLInputElement>) {
    // Bôi đen nội dung sẵn có khi focus vào ô, để gõ số mới sẽ ghi đè
    // thay vì bị chặn do ô đã có 1 ký tự.
    e.target.select();
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setCode(next);
    focusInput(Math.min(pasted.length, 5));
  }

  function handleResend() {
    setError("");
    setSubmitting(true);
    forgotPassword(email).then((result) => {
      setSubmitting(false);
      if (!result.ok) {
        const message = result.message ?? "Không thể gửi lại mã lúc này.";
        setError(message);
        showToast(message, "error");
        return;
      }
      showToast("Đã gửi lại mã xác nhận.", "success");
    });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (codeValue.length !== 6) {
      setError("Vui lòng nhập đủ 6 chữ số.");
      return;
    }

    setSubmitting(true);
    verifyResetCode(email, codeValue).then((result) => {
      setSubmitting(false);

      if (!result.ok) {
        const message = result.message ?? "Mã xác nhận không đúng hoặc đã hết hạn.";
        setError(message);
        showToast(message, "error");
        return;
      }

      onVerified(codeValue, result.token);
    });
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Nhập mã xác nhận"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
          <CloseIcon />
        </button>

        <h2 className={styles.title}>Nhập mã xác nhận</h2>
        <p className={styles.subtitle}>
          Nhập mã xác nhận gồm 6 chữ số vừa được gửi tới <b>{email}</b>.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.codeInputs}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  codeInputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                className={styles.codeDigit}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onFocus={handleFocus}
                onPaste={handlePaste}
                autoFocus={index === 0}
              />
            ))}
          </div>

          {error ? <p className={styles.errorMessage}>{error}</p> : null}

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? "Đang xác nhận..." : "Xác nhận mã"}
          </button>

          <button type="button" className={styles.backLink} onClick={handleResend} disabled={submitting}>
            Gửi lại mã
          </button>
        </form>

        <div className={styles.footerLinks}>
          <button type="button" className={styles.backLink} onClick={onBack}>
            ← Đổi email khác
          </button>
          <button type="button" className={styles.backLink} onClick={onSwitchToLogin}>
            Quay lại đăng nhập
          </button>
        </div>
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
