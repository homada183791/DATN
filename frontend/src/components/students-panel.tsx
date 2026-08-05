"use client";

import { useState } from "react";
import styles from "./students-panel.module.css";

interface StudentItem {
  id: string;
  fullName: string;
  username: string;
  email: string;
  classNames: string[];
}

// TODO: thay bằng dữ liệu thật từ GET /api/students khi backend sẵn sàng
const students: StudentItem[] = [];

export function StudentsPanel() {
  const [myClassesOnly, setMyClassesOnly] = useState(true);
  const [search, setSearch] = useState("");

  const [columnWidths, setColumnWidths] = useState([
    220,
    220,
    320,
    320,
  ]);

  const MIN_WIDTH = 120;

  const startResize = (
    e: React.MouseEvent,
    columnIndex: number
  ) => {
    e.preventDefault();

    if (columnIndex >= columnWidths.length - 1) {
      return;
    }

    const startX = e.clientX;

    const leftWidth = columnWidths[columnIndex];
    const rightWidth = columnWidths[columnIndex + 1];

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;

      let newLeftWidth = leftWidth + delta;
      let newRightWidth = rightWidth - delta;

      if (newLeftWidth < MIN_WIDTH) {
        newLeftWidth = MIN_WIDTH;
        newRightWidth =
          leftWidth + rightWidth - MIN_WIDTH;
      }

      if (newRightWidth < MIN_WIDTH) {
        newRightWidth = MIN_WIDTH;
        newLeftWidth =
          leftWidth + rightWidth - MIN_WIDTH;
      }

      setColumnWidths((prev) => {
        const updated = [...prev];

        updated[columnIndex] = newLeftWidth;
        updated[columnIndex + 1] = newRightWidth;

        return updated;
      });
    };

    const onMouseUp = () => {
      document.removeEventListener(
        "mousemove",
        onMouseMove
      );

      document.removeEventListener(
        "mouseup",
        onMouseUp
      );
    };

    document.addEventListener(
      "mousemove",
      onMouseMove
    );

    document.addEventListener(
      "mouseup",
      onMouseUp
    );
  };

  return (
    <div>
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <div className={styles.titleRow}>
            <h1 className={styles.header}>Sinh viên</h1>

            <button
              type="button"
              className={`${styles.filterChip} ${
                myClassesOnly
                  ? styles.filterChipActive
                  : styles.filterChipInactive
              }`}
              onClick={() =>
                setMyClassesOnly((v) => !v)
              }
            >
              Lớp của tôi
            </button>
          </div>

          <p className={styles.subtitle}>
            {myClassesOnly
              ? "Hiển thị sinh viên trong lớp bạn phụ trách"
              : "Hiển thị tất cả sinh viên trong hệ thống"}
          </p>
        </div>

        <div className={styles.searchBox}>
          <SearchIcon />

          <input
            type="text"
            placeholder="Tìm theo tên, tên đăng nhập, email..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelTop}>
          <span className={styles.rowCount}>
            {students.length} dòng
          </span>

          <button
            type="button"
            className={styles.filterBtn}
          >
            <FilterIcon />
            Sắp xếp &amp; Lọc
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <colgroup>
              <col
                style={{
                  width: `${columnWidths[0]}px`,
                }}
              />
              <col
                style={{
                  width: `${columnWidths[1]}px`,
                }}
              />
              <col
                style={{
                  width: `${columnWidths[2]}px`,
                }}
              />
              <col
                style={{
                  width: `${columnWidths[3]}px`,
                }}
              />
            </colgroup>

            <thead>
              <tr>
                <th>
                  Họ tên
                  <div
                    className={styles.resizer}
                    onMouseDown={(e) =>
                      startResize(e, 0)
                    }
                  />
                </th>

                <th>
                  Tên đăng nhập
                  <div
                    className={styles.resizer}
                    onMouseDown={(e) =>
                      startResize(e, 1)
                    }
                  />
                </th>

                <th>
                  Email
                  <div
                    className={styles.resizer}
                    onMouseDown={(e) =>
                      startResize(e, 2)
                    }
                  />
                </th>

                <th>Lớp học</th>
              </tr>
            </thead>

            <tbody>
              {students.length === 0 ? (
                <tr className={styles.emptyRow}>
                  <td colSpan={4}>
                    Không tìm thấy sinh viên nào
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id}>
                    <td className={styles.nameCell}>
                      {s.fullName}
                    </td>

                    <td
                      className={
                        styles.usernameCell
                      }
                    >
                      {s.username}
                    </td>

                    <td
                      className={styles.emailCell}
                    >
                      {s.email}
                    </td>

                    <td>
                      <div
                        className={
                          styles.classList
                        }
                      >
                        {s.classNames.map(
                          (name) => (
                            <span
                              key={name}
                              className={
                                styles.classChip
                              }
                            >
                              {name}
                            </span>
                          )
                        )}
                      </div>
                    </td>
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