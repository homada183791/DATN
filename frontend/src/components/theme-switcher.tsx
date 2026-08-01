"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./topbar-dropdown.module.css";

type Theme = "light" | "dark";

const options: { key: Theme; label: string }[] = [
  { key: "light", label: "Sáng" },
  { key: "dark", label: "Tối" },
];

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("light");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Áp dụng theme lên thẻ <html> để CSS variables trong globals.css đổi theo
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-label="Đổi giao diện sáng/tối"
      >
        {theme === "dark" ? <MoonIcon /> : <SunIcon />}
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="menuitem"
              className={`${styles.item} ${theme === opt.key ? styles.itemActive : ""}`}
              onClick={() => {
                setTheme(opt.key);
                setOpen(false);
              }}
            >
              {opt.key === "dark" ? <MoonIcon /> : <SunIcon />}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
