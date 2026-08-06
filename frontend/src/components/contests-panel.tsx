"use client";

import { useState } from "react";
import styles from "./contests-panel.module.css";
import { useAuth } from "@/lib/auth/auth-context";
import { ContestImportModal } from "./contest-import-modal";

type StatusTab = "ongoing" | "upcoming" | "ended";

interface Contest {
  id: string;
  title: string;
  joined: boolean;
  requiresOtp?: boolean;
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
  const [showImportModal, setShowImportModal] = useState(false);
  const { user } = useAuth();
  const isInstructor = user?.role === "instructor";

  // TODO: lọc contests theo tab khi đã có dữ liệu thật (status ongoing/upcoming/ended)
  const filtered = contests;

  return (
    <div>
      <div className={styles.headerRow}>
        <h1 className={styles.header}>Cuộc thi</h1>

        {isInstructor && (
          <div className={styles.instructorToolbar}>
            <a href="/instructor/format-guide" className={styles.outlineBtn}>
              Hướng dẫn định dạng
            </a>
            <button
              type="button"
              className={styles.outlineBtn}
              onClick={() => setShowImportModal(true)}
            >
              <ImportIcon />
              Import cuộc thi
            </button>
            <a href="/instructor/contests/new" className={styles.createBtn}>
              <PlusIcon />
              Tạo cuộc thi
            </a>
          </div>
        )}
      </div>

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
            <ContestCard key={c.id} contest={c} isInstructor={isInstructor} />
          ))}
        </div>
      )}

      <ContestImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
}

function ContestCard({
  contest,
  isInstructor,
}: {
  contest: Contest;
  isInstructor: boolean;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{contest.title}</h3>
          {contest.requiresOtp && (
            <span className={styles.otpBadge}>
              <LockIcon />
              OTP
            </span>
          )}
          <span className={styles.joinBadge}>
            {contest.joined ? "Đã tham gia" : "Chưa tham gia"}
          </span>
        </div>

        {isInstructor ? (
          <div className={styles.cardActions}>
            <button type="button" className={styles.actionBtn}>
              <EditIcon />
              Chỉnh sửa
            </button>
            <button type="button" className={styles.actionBtn}>
              <LockIcon />
              Khóa đăng ký
            </button>
            <button type="button" className={styles.actionBtn}>
              <DuplicateIcon />
              Nhân bản
            </button>
            <a href={`/instructor/contests/${contest.id}`} className={styles.actionBtn}>
              Xem
            </a>
          </div>
        ) : (
          <a href={`/contests/${contest.id}`} className={styles.viewBtn}>
            Xem
          </a>
        )}
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

function ImportIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3v12M7 10l5 5 5-5M4 19h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20l4.3-.9L20.5 6.8a1.5 1.5 0 000-2.1l-1.2-1.2a1.5 1.5 0 00-2.1 0L5 15.7 4 20z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10V7a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function DuplicateIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
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
