"use client";

import { useRef, useState } from "react";
import styles from "./submissions-panel.module.css";
import {
  useResizableColumns,
  type ColumnDef,
} from "@/lib/use-resizable-columns";

interface SubmissionItem {
  id: string;
  problemName: string;
  studentName: string;
  username: string;
  language: string;
  result: string;
  score: number;
  runtime: string;
  submittedAt: string;
}

const submissions: SubmissionItem[] = [];

const allColumns: ColumnDef[] = [
  { key: "id", label: "ID", width: 100, minWidth: 80 },
  { key: "problem", label: "Bài tập", width: 220, minWidth: 180 },
  { key: "student", label: "Sinh viên", width: 220, minWidth: 180 },
  { key: "language", label: "Ngôn ngữ", width: 120, minWidth: 100 },
  { key: "result", label: "Kết quả", width: 150, minWidth: 120 },
  { key: "score", label: "Điểm", width: 100, minWidth: 80 },
  { key: "runtime", label: "Thời gian", width: 120, minWidth: 90 },
  { key: "submittedAt", label: "Thời điểm", width: 180, minWidth: 150 },
];

const pendingColumns: ColumnDef[] = [
  { key: "id", label: "ID", width: 100, minWidth: 80 },
  { key: "problem", label: "Bài tập", width: 260, minWidth: 180 },
  { key: "student", label: "Sinh viên", width: 240, minWidth: 180 },
  { key: "language", label: "Ngôn ngữ", width: 120, minWidth: 100 },
  { key: "status", label: "Trạng thái", width: 150, minWidth: 120 },
  { key: "submittedAt", label: "Thời điểm", width: 180, minWidth: 150 },
];

export function SubmissionsPanel() {
  const [activeTab, setActiveTab] = useState<"all" | "pending">("all");
  const [search, setSearch] = useState("");

  const tableWrapRef = useRef<HTMLDivElement>(null);

  const currentColumns =
    activeTab === "pending" ? pendingColumns : allColumns;

  const { widths, startResize } = useResizableColumns(
    currentColumns,
    tableWrapRef
  );

  return (
    <div>
      <div className={styles.headerRow}>
        <h1 className={styles.header}>Bài nộp</h1>

        <div className={styles.searchBox}>
          <SearchIcon />

          <input
            type="text"
            placeholder="Tìm bài tập, sinh viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.controlsRow}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${
              activeTab === "all" ? styles.tabActive : ""
            }`}
            onClick={() => setActiveTab("all")}
          >
            Tất cả
          </button>

          <button
            type="button"
            className={`${styles.tab} ${
              activeTab === "pending" ? styles.tabActive : ""
            }`}
            onClick={() => setActiveTab("pending")}
          >
            Hàng chờ chấm
          </button>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelTop}>
          <span className={styles.rowCount}>
            {submissions.length} dòng
          </span>

          <button
            type="button"
            className={styles.filterBtn}
          >
            <FilterIcon />
            Sắp xếp &amp; Lọc
          </button>
        </div>

        <div
          ref={tableWrapRef}
          className={styles.tableWrap}
        >
          <table
            className={styles.table}
            style={{
              width: "100%",
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              {currentColumns.map((column, index) => (
                <col
                  key={column.key}
                  style={
                    index === currentColumns.length - 1
                      ? undefined
                      : { width: widths[column.key] }
                  }
                />
              ))}
            </colgroup>

            <thead>
              <tr>
                {currentColumns.map((column, index) => {
                  const isLast =
                    index === currentColumns.length - 1;

                  return (
                    <th
                      key={column.key}
                      className={styles.th}
                    >
                      <span className={styles.thLabel}>
                        {column.label}
                      </span>

                      {!isLast && (
                        <span
                          className={styles.resizeHandle}
                          onMouseDown={startResize(
                            column.key,
                            column.minWidth
                          )}
                          role="separator"
                          aria-orientation="vertical"
                          aria-label={`Kéo để đổi độ rộng cột ${column.label}`}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {submissions.length === 0 ? (
                <tr className={styles.emptyRow}>
                  <td colSpan={currentColumns.length}>
                    {activeTab === "pending"
                      ? "Không có bài nào đang trong hàng chờ chấm"
                      : "Không có bài nộp nào"}
                  </td>
                </tr>
              ) : activeTab === "pending" ? (
                submissions.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.problemName}</td>

                    <td>
                      <div>{item.studentName}</div>
                      <small>{item.username}</small>
                    </td>

                    <td>{item.language}</td>

                    <td>Đang chờ chấm</td>

                    <td>{item.submittedAt}</td>
                  </tr>
                ))
              ) : (
                submissions.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>

                    <td>{item.problemName}</td>

                    <td>
                      <div>{item.studentName}</div>
                      <small>{item.username}</small>
                    </td>

                    <td>{item.language}</td>

                    <td>{item.result}</td>

                    <td>{item.score}</td>

                    <td>{item.runtime}</td>

                    <td>{item.submittedAt}</td>
                  </tr>
                ))
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
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M20 20l-3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M4 6h16M7 12h10M10 18h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}