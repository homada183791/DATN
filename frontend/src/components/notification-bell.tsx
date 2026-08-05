"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./topbar-dropdown.module.css";

// TODO: thay bằng dữ liệu thật từ GET /api/notifications khi backend sẵn sàng
const notifications: { id: string; message: string }[] = [];

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const count = notifications.length;

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
        aria-label="Thông báo"
        style={{ position: "relative" }}
      >
        <BellIcon />
        {count > 0 && <span className={styles.badge}>{count}</span>}
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          {count === 0 ? (
            <p className={styles.emptyNote}>Chưa có thông báo nào</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={styles.item}>
                {n.message}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 9a6 6 0 0112 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 19a2 2 0 004 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
