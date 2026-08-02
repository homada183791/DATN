"use client";

import { useState } from "react";
import styles from "./contests-panel.module.css";

type StatusTab = "ongoing" | "upcoming" | "ended";

interface Contest {
  id: string;
  title: string;
  joined: boolean;
  timeRangeLabel: string;
  durationLabel: string;
  problemCountLabel: string;
  updatedLabel: string;
}

const statusTabs: { key: StatusTab; label: string; dotClass: string }[] = [
  { key: "ongoing", label: "Đang diễn ra", dotClass: styles.dotOngoing },
  { key: "upcoming", label: "Sắp diễn ra", dotClass: styles.dotUpcoming },
  { key: "ended", label: "Đã kết thúc", dotClass: styles.dotEnded },
];

// TODO: thay bằng dữ liệu thật từ GET /api/contests khi backend sẵn sàng
const contests: Contest[] = [];

export function ContestsPanel() {
  const [tab, setTab] = useState<StatusTab>("ongoing");

  // TODO: lọc contests theo tab khi đã có dữ liệu thật (status ongoing/upcoming/ended)
  const filtered = contests;

  return (
    <div>
      <h1 className={styles.header}>Cuộc thi</h1>

      <div className={styles.statusTabs} role="tablist">
        {statusTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`${styles.statusTab} ${tab === t.key ? styles.statusTabActive : ""}`}
            onClick={() => setTab(t.key)}
          >
            <span className={`${styles.statusDot} ${t.dotClass}`} />
            {t.label.toUpperCase()}
            <span className={styles.count}>0</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptySection}>
          <TrophyEmptyIcon />
          <p className={styles.emptySectionText}>Không tìm thấy cuộc thi nào</p>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map((c) => (
            <ContestCard key={c.id} contest={c} />
          ))}
        </div>
      )}

    </div>
  );
}

function ContestCard({ contest }: { contest: Contest }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{contest.title}</h3>
          <span className={styles.joinBadge}>
            {contest.joined ? "Đã tham gia" : "Chưa tham gia"}
          </span>
        </div>
        <a href={`/contests/${contest.id}`} className={styles.viewBtn}>
          Xem
        </a>
      </div>

      <div className={styles.metaRow}>
        <ClockIcon />
        <span>{contest.timeRangeLabel}</span>
        <span className={styles.metaDot}>·</span>
        <span>{contest.durationLabel}</span>
        <span className={styles.metaDot}>·</span>
        <span>{contest.problemCountLabel}</span>
      </div>

      <p className={styles.updatedLabel}>{contest.updatedLabel}</p>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function TrophyEmptyIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 4h10v5a5 5 0 01-10 0V4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M7 5H4a1 1 0 000 2 3 3 0 003 3M17 5h3a1 1 0 010 2 3 3 0 01-3 3M10 15v3H8v2h8v-2h-2v-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
