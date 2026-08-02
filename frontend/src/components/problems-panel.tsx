"use client";

import { useRef, useState } from "react";
import styles from "./problems-panel.module.css";
import { useToast } from "./toast-context";
import { useResizableColumns, type ColumnDef } from "@/lib/use-resizable-columns";

type Tab = "problems" | "problem-sets";

const columns: ColumnDef[] = [
  { key: "title", label: "Bài tập", width: 280, minWidth: 160 },
  { key: "difficulty", label: "Độ khó", width: 120, minWidth: 90 },
  { key: "points", label: "Điểm", width: 100, minWidth: 70 },
  { key: "problemSet", label: "Bộ bài tập", width: 140, minWidth: 100 },
  { key: "uploadedAt", label: "Ngày tải lên", width: 160, minWidth: 120 },
  { key: "tags", label: "Tags", width: 220, minWidth: 140 },
];

// TODO: thay bằng dữ liệu thật từ GET /api/problems khi backend sẵn sàng
const problems: unknown[] = [];

// TODO: thay bằng trạng thái đăng nhập thật (context/hook auth) khi nối API
const isLoggedIn = false;

export function ProblemsPanel() {
  const [tab, setTab] = useState<Tab>("problems");
  const [search, setSearch] = useState("");
  const { showToast } = useToast();
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const { widths, startResize } = useResizableColumns(columns, tableWrapRef);

  function handleTabClick(nextTab: Tab) {
    setTab(nextTab);
    if (nextTab === "problem-sets" && !isLoggedIn) {
      showToast("Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.");
    }
  }

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
            onClick={() => handleTabClick("problems")}
          >
            Bài tập
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "problem-sets"}
            className={`${styles.tab} ${tab === "problem-sets" ? styles.tabActive : ""}`}
            onClick={() => handleTabClick("problem-sets")}
          >
            Bộ bài tập
          </button>
        </div>

        <div className={styles.miniSearch}>
          <SearchIcon />
          <input
            type="text"
            placeholder={
              tab === "problems" ? "Tìm kiếm bài tập..." : "Tìm kiếm bộ bài tập..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {tab === "problems" ? (
        <div className={styles.panel}>
          <div className={styles.panelTop}>
            <span className={styles.rowCount}>{problems.length} dòng</span>
            <button type="button" className={styles.filterBtn}>
              <FilterIcon />
              Sắp xếp &amp; Lọc
            </button>
          </div>

          <div className={styles.tableWrap} ref={tableWrapRef}>
            <table className={styles.table} style={{ width: "100%", tableLayout: "fixed" }}>
              <colgroup>
                {columns.map((c, i) => (
                  <col
                    key={c.key}
                    style={i === columns.length - 1 ? undefined : { width: widths[c.key] }}
                  />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {columns.map((c, i) => {
                    const isLast = i === columns.length - 1;
                    return (
                      <th key={c.key} className={styles.th}>
                        <span className={styles.thLabel}>{c.label}</span>
                        {!isLast && (
                          <span
                            className={styles.resizeHandle}
                            onMouseDown={startResize(c.key, c.minWidth)}
                            role="separator"
                            aria-orientation="vertical"
                            aria-label={`Kéo để đổi độ rộng cột ${c.label}`}
                          />
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {problems.length === 0 && (
                  <tr className={styles.emptyRow}>
                    <td colSpan={columns.length}>Không tìm thấy bài tập nào</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className={styles.emptySection}>
          <InboxIcon />
          <p className={styles.emptySectionText}>Chưa có bộ bài tập nào</p>
        </div>
      )}
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

function InboxIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <rect x="14" y="24" width="44" height="34" rx="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M14 40h11l3 6h16l3-6h11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="53" cy="18" r="9" fill="currentColor" opacity="0.15" />
      <path
        d="M48 15.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5c0 2-1.4 3.6-3.3 4.2l-.2 1.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="52.8" cy="23.5" r="0.9" fill="currentColor" />
    </svg>
  );
}
