"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./create-problem-set-panel.module.css";
import { useToast } from "./toast-context";

type SetStatus = "draft" | "published" | "hidden";

interface ProblemSetFormState {
  code: string;
  title: string;
  status: SetStatus;
  classId: string;
  startAt: string;
  endAt: string;
  problemIds: string[];
}

const initialForm: ProblemSetFormState = {
  code: "",
  title: "",
  status: "draft",
  classId: "",
  startAt: "",
  endAt: "",
  problemIds: [],
};

export function CreateProblemSetPanel() {
  const [form, setForm] = useState<ProblemSetFormState>(initialForm);
  const router = useRouter();
  const { showToast } = useToast();

  function update<K extends keyof ProblemSetFormState>(
    key: K,
    value: ProblemSetFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCancel() {
    router.push("/");
  }

  function handleSave() {
    if (!form.code.trim() || !form.title.trim()) {
      showToast("Vui lòng điền Mã bộ và Tiêu đề.");
      return;
    }
    if (form.startAt && form.endAt && new Date(form.endAt).getTime() <= new Date(form.startAt).getTime()) {
      showToast("Thời điểm Kết thúc phải sau Bắt đầu.");
      return;
    }
    // TODO: nối API thật — POST /api/problem-sets
    showToast(`Đã lưu bộ bài tập "${form.title}" — chức năng lưu thật đang chờ nối API.`);
    router.push("/");
  }

  return (
    <div>
      <div className={styles.headerBar}>
        <h1 className={styles.headerTitle}>Tạo bộ bài tập</h1>
        <div className={styles.headerActions}>
          <button type="button" className={styles.cancelBtn} onClick={handleCancel}>
            Hủy
          </button>
          <button type="button" className={styles.saveBtn} onClick={handleSave}>
            Lưu
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.row2}>
          <label className={styles.field}>
            <span className={styles.label}>Mã bộ</span>
            <input
              type="text"
              placeholder="PS-ARR"
              value={form.code}
              onChange={(e) => update("code", e.target.value.toUpperCase())}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Tiêu đề</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </label>
        </div>

        <div className={styles.row2}>
          <label className={styles.field}>
            <span className={styles.label}>Trạng thái</span>
            <select value={form.status} onChange={(e) => update("status", e.target.value as SetStatus)}>
              <option value="draft">Nháp</option>
              <option value="published">Đã xuất bản</option>
              <option value="hidden">Đã ẩn</option>
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Lớp học</span>
            <select value={form.classId} onChange={(e) => update("classId", e.target.value)}>
              <option value="">Chọn lớp học...</option>
              {/* TODO: đổ danh sách lớp thật từ GET /api/classes */}
            </select>
          </label>
        </div>

        <div className={styles.row2}>
          <label className={styles.field}>
            <span className={styles.label}>Bắt đầu</span>
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => update("startAt", e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Kết thúc</span>
            <input
              type="datetime-local"
              value={form.endAt}
              onChange={(e) => update("endAt", e.target.value)}
            />
          </label>
        </div>

        <label className={`${styles.field} ${styles.fieldFull}`}>
          <span className={styles.label}>Bài tập</span>
          <select disabled value="">
            <option value="">Chọn bài tập...</option>
            {/* TODO: đổ danh sách bài tập thật từ GET /api/problems, cho phép chọn nhiều */}
          </select>
        </label>
      </div>
    </div>
  );
}
