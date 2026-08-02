"use client";

import { useEffect, useState } from "react";
import styles from "./system-clock.module.css";

export function SystemClock({ leftOffset }: { leftOffset: number }) {
  // Chuỗi rỗng ban đầu để khớp giữa server render và client render đầu tiên,
  // tránh lỗi hydration mismatch — giờ thật chỉ được điền sau khi mount.
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    function update() {
      const formatter = new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour12: false,
      });
      const parts = formatter.formatToParts(new Date());
      const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
      setTime(`${get("hour")}:${get("minute")}`);
      setDate(`${get("day")}/${get("month")}/${get("year")}`);
    }

    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;

  return (
    <div className={styles.badge} style={{ left: leftOffset }}>
      <span className={styles.liveDot} />
      <ClockIcon />
      <span>
        <span className={styles.time}>{time}</span>{" "}
        <span className={styles.date}>{date} · giờ VN</span>
      </span>
    </div>
  );
}

function ClockIcon() {
  return (
    <span className={styles.icon}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}
