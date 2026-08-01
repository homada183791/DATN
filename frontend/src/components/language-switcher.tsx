"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./topbar-dropdown.module.css";

type Lang = "vi" | "en";

const options: { key: Lang; label: string; flag: string }[] = [
  { key: "vi", label: "Tiếng Việt", flag: "VN" },
  { key: "en", label: "English", flag: "GB" },
];

export function LanguageSwitcher() {
  const [lang, setLang] = useState<Lang>("vi");
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

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-label="Đổi ngôn ngữ"
      >
        <GlobeIcon />
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="menuitem"
              className={`${styles.item} ${lang === opt.key ? styles.itemActive : ""}`}
              onClick={() => {
                setLang(opt.key);
                setOpen(false);
                // TODO: nối i18n thật (next-intl / react-i18next) để đổi ngôn ngữ toàn trang
              }}
            >
              <span
                className={`${styles.flag} ${lang === opt.key ? styles.flagActive : ""}`}
              >
                {opt.flag}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3 12h18M12 3c2.5 2.5 4 5.7 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.7-4-9s1.5-6.5 4-9z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}
