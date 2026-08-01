"use client";

import { useState } from "react";
import styles from "./problems-panel.module.css";

type Tab = "problems" | "problem-sets";

// TODO: thay bằng dữ liệu thật từ GET /api/problems khi backend sẵn sàng
const problems: unknown[] = [];

export function ProblemsPanel() {
  const [tab, setTab] = useState<Tab>("problems");
  const [search, setSearch] = useState("");

  return (
    <div>
      <h1 className={styles.header}>Bài tập</h1>

      <div className={styles.controlsRow}>
        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "problems"}
            className={`${styles.tab} ${tab === "problems" ? styles.tabActive : ""}`}
            onClick={() => setTab("problems")}
          >
            Bài tập
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "problem-sets"}
            className={`${styles.tab} ${tab === "problem-sets" ? styles.tabActive : ""}`}
            onClick={() => setTab("problem-sets")}
          >
            Bộ bài tập
          </button>
        </div>

        <div className={styles.miniSearch}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Tìm kiếm bài tập..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelTop}>
          <span className={styles.rowCount}>{problems.length} dòng</span>
          <button type="button" className={styles.filterBtn}>
            <FilterIcon />
            Sắp xếp &amp; Lọc
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Bài tập</th>
                <th>Độ khó</th>
                <th>Điểm</th>
                <th>Bộ bài tập</th>
                <th>Ngày tải lên</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              {problems.length === 0 && (
                <tr className={styles.emptyRow}>
                  <td colSpan={6}>Không tìm thấy bài tập nào</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 6h16M7 12h10M10 18h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
