"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./topbar-dropdown.module.css";
import { useAuth } from "@/lib/auth/auth-context";

const roleLabel: Record<string, string> = {
  instructor: "instructor",
  student: "student",
};

export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.userTrigger}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.avatar}>{user.name.charAt(0).toUpperCase()}</span>
        <span className={styles.userText}>
          <span className={styles.userName}>{user.name}</span>
          <span className={styles.userRole}>{roleLabel[user.role] ?? user.role}</span>
        </span>
        <ChevronDownIcon />
      </button>

      {open && (
        <div className={`${styles.menu} ${styles.userMenuPanel}`} role="menu">
          <div className={styles.menuHeader}>
            <span className={styles.avatar}>{user.name.charAt(0).toUpperCase()}</span>
            <span className={styles.userText}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userRole}>{roleLabel[user.role] ?? user.role}</span>
            </span>
          </div>

          <div className={styles.menuDivider} />

          <button
            type="button"
            className={styles.item}
            onClick={() => {
              setOpen(false);
              // TODO: điều hướng sang trang hồ sơ thật khi có (vd: /profile)
            }}
          >
            <ProfileIcon />
            Trang cá nhân
          </button>

          <button
            type="button"
            className={styles.item}
            onClick={() => {
              setOpen(false);
              // TODO: điều hướng sang trang cài đặt thật khi có (vd: /settings)
            }}
          >
            <SettingsIcon />
            Cài đặt
          </button>

          <div className={styles.menuDivider} />

          <button
            type="button"
            className={`${styles.item} ${styles.itemDanger}`}
            onClick={() => {
              logout();
              setOpen(false);
              // Về thẳng trang chủ — quan trọng nếu đang đứng ở route
              // chỉ dành cho instructor (vd: /instructor/dashboard), để
              // không bị kẹt lại trang đó với nội dung trống sau khi mất quyền.
              router.push("/");
            }}
          >
            <LogoutIcon />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

function ProfileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 17c0-2 2.2-3.5 5-3.5s5 1.5 5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  const teeth = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.3" stroke="currentColor" strokeWidth="1.6" />
      {teeth.map((angle) => (
        <rect
          key={angle}
          x="11.1"
          y="1.6"
          width="1.8"
          height="2.6"
          rx="0.5"
          fill="currentColor"
          transform={`rotate(${angle} 12 12)`}
        />
      ))}
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
