"use client";

import styles from "./dashboard-panel.module.css";
import { StatCard } from "./stat-card";
import { ContributedProblemsTable } from "./contributed-problems-table";
import { UpcomingContestsPanel } from "./upcoming-contests-panel";
import { QuickActionsPanel } from "./quick-actions-panel";
import { UsersIcon, FileEditIcon } from "@/components/nav-icons";
import { useAuth } from "@/lib/auth/auth-context";

// TODO: thay 4 số liệu này bằng dữ liệu thật từ GET /api/instructor/overview
const stats = {
  activeClasses: 0,
  drafts: 0,
  submissionsToday: 0,
  pendingReview: 0,
};

export function DashboardPanel() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className={styles.welcomeTitle}>
        Chào mừng trở lại{user ? `, ${user.name}` : ""}
      </h1>
      <p className={styles.welcomeSubtitle}>Tổng quan hôm nay</p>

      <div className={styles.statsRow}>
        <StatCard icon={<UsersIcon />} value={stats.activeClasses} label="Lớp hoạt động" />
        <StatCard icon={<FileEditIcon />} value={stats.drafts} label="Bài nháp" />
        <StatCard icon={<ActivityIcon />} value={stats.submissionsToday} label="Bài nộp hôm nay" />
        <StatCard icon={<EyeIcon />} value={stats.pendingReview} label="Đang duyệt" />
      </div>

      <div className={styles.grid}>
        <ContributedProblemsTable />
        <div className={styles.rightCol}>
          <UpcomingContestsPanel />
          <QuickActionsPanel />
        </div>
      </div>
    </div>
  );
}

function ActivityIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 12h4l2-7 4 14 2-7h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon() {
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
