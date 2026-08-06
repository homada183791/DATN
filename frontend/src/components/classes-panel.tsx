"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./classes-panel.module.css";
import { useResizableColumns, type ColumnDef } from "@/lib/use-resizable-columns";
import { CreateClassModal } from "./create-class-modal";
import { ClassImportModal } from "./class-import-modal";

interface ClassItem {
  id: string;
  name: string;
  description: string | null;
  teacherCount: number;
  studentCount: number;
  problemSetCount: number;
  examCount: number;
  memberCount: number;
}

// "Mô tả" cố tình để cuối mảng — cột cuối cùng trong danh sách này sẽ tự
// giãn lấp khoảng trống còn lại bên phải (không có tay kéo riêng), y hệt
// cách cột "Tags" hoạt động ở bảng Bài tập. "Thao tác" không nằm trong
// mảng này vì nó là cột cố định 64px, không tham gia kéo giãn.
const columns: ColumnDef[] = [
  { key: "name", label: "Tên lớp", width: 220, minWidth: 160 },
  { key: "teachers", label: "Giảng viên", width: 110, minWidth: 90 },
  { key: "students", label: "Học sinh", width: 110, minWidth: 90 },
  { key: "problemSets", label: "Bộ bài", width: 100, minWidth: 80 },
  { key: "exams", label: "Kỳ thi", width: 100, minWidth: 80 },
  { key: "members", label: "Thành viên", width: 120, minWidth: 90 },
  { key: "description", label: "Mô tả", width: 200, minWidth: 140 },
];

// TODO: thay bằng dữ liệu thật từ GET /api/classes khi backend sẵn sàng
const classes: ClassItem[] = [];

export function ClassesPanel() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const { widths, startResize } = useResizableColumns(columns, tableWrapRef);

  return (
    <div>
      <div className={styles.headerRow}>
        <h1 className={styles.header}>Lớp học</h1>

        <div className={styles.headerActions}>
          <div className={styles.searchBox}>
            <SearchIcon />
            <input
              type="text"
              placeholder="Tìm theo tên lớp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <a href="/instructor/format-guide" className={styles.outlineBtn}>
            Hướng dẫn định dạng
          </a>
          <button
            type="button"
            className={styles.outlineBtn}
            onClick={() => setImportOpen(true)}
          >
            <ImportIcon />
            Import lớp học
          </button>
        </div>
      </div>

      <div className={styles.newRow}>
        <button type="button" className={styles.createBtn} onClick={() => setCreateOpen(true)}>
          <PlusIcon />
          Tạo lớp
        </button>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelTop}>
          <span className={styles.rowCount}>{classes.length} dòng</span>
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
              <col style={{ width: 64 }} />
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
                <th className={styles.thAction}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 ? (
                <tr className={styles.emptyRow}>
                  <td colSpan={columns.length + 1}>Không tìm thấy lớp học nào</td>
                </tr>
              ) : (
                classes.map((c) => <ClassRow key={c.id} item={c} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateClassModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ClassImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

function ClassRow({ item }: { item: ClassItem }) {
  return (
    <tr>
      <td>{item.name}</td>
      <td className={styles.numCell}>{item.teacherCount}</td>
      <td className={styles.numCell}>{item.studentCount}</td>
      <td className={styles.numCell}>{item.problemSetCount}</td>
      <td className={styles.numCell}>{item.examCount}</td>
      <td className={styles.numCell}>{item.memberCount}</td>
      <td className={styles.descCell}>{item.description ?? "-"}</td>
      <td className={styles.actionCell}>
        <ClassRowActions />
      </td>
    </tr>
  );
}

function ClassRowActions() {
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
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        className={styles.moreBtn}
        onClick={() => setOpen((v) => !v)}
        aria-label="Thao tác"
      >
        <MoreIcon />
      </button>

      {open && (
        <div className={styles.actionMenu} role="menu">
          <button type="button" className={styles.actionMenuItem} onClick={() => setOpen(false)}>
            <DownloadIcon />
            Tải lớp học (.zip)
          </button>
          <button type="button" className={styles.actionMenuItem} onClick={() => setOpen(false)}>
            <EditIcon />
            Chỉnh sửa lớp
          </button>
          <button type="button" className={styles.actionMenuItem} onClick={() => setOpen(false)}>
            <DuplicateIcon />
            Nhân bản
          </button>
          <button
            type="button"
            className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`}
            onClick={() => setOpen(false)}
          >
            <TrashIcon />
            Xóa
          </button>
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
      <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

function MoreIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="19" r="1.6" fill="currentColor" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3v12M7 10l5 5 5-5M4 19h16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20l4.3-.9L20.5 6.8a1.5 1.5 0 000-2.1l-1.2-1.2a1.5 1.5 0 00-2.1 0L5 15.7 4 20z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DuplicateIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7h16M9 7V4.5A1.5 1.5 0 0110.5 3h3A1.5 1.5 0 0115 4.5V7M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
