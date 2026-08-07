"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./create-contest-panel.module.css";
import { ToggleSwitch } from "./toggle-switch";
import { InfoTooltip } from "./info-tooltip";
import { useToast } from "./toast-context";

type SubmissionLogVisibility = "private" | "after_end" | "public";
type ScoringMode = "best" | "last";

interface ContestFormState {
  name: string;
  classId: string;
  startAt: string;
  endAt: string;

  allowJoin: boolean;
  requireOtp: boolean;
  requireStudentId: boolean;

  submissionLogVisibility: SubmissionLogVisibility;
  hideLeaderboardUntilEnd: boolean;
  scoringMode: ScoringMode;
  freezeLeaderboard: boolean;
}

const initialForm: ContestFormState = {
  name: "",
  classId: "",
  startAt: "",
  endAt: "",

  allowJoin: true,
  requireOtp: false,
  requireStudentId: false,

  submissionLogVisibility: "private",
  hideLeaderboardUntilEnd: false,
  scoringMode: "best",
  freezeLeaderboard: false,
};

function computeDurationLabel(startAt: string, endAt: string): string {
  if (!startAt || !endAt) return "-";
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return "-";
  return String(Math.round((end - start) / 60000));
}

export function CreateContestPanel() {
  const [form, setForm] = useState<ContestFormState>(initialForm);
  const router = useRouter();
  const { showToast } = useToast();

  const durationLabel = useMemo(
    () => computeDurationLabel(form.startAt, form.endAt),
    [form.startAt, form.endAt]
  );

  function update<K extends keyof ContestFormState>(key: K, value: ContestFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCancel() {
    router.push("/contests");
  }

  function handleSave() {
    if (!form.name.trim() || !form.startAt || !form.endAt) {
      showToast("Vui lòng điền Tên, Mở lúc và Đóng lúc.");
      return;
    }
    if (new Date(form.endAt).getTime() <= new Date(form.startAt).getTime()) {
      showToast("Thời điểm Đóng lúc phải sau Mở lúc.");
      return;
    }
    // TODO: nối API thật — POST /api/contests
    showToast(`Đã lưu kỳ thi "${form.name}" — chức năng lưu thật đang chờ nối API.`);
    router.push("/contests");
  }

  return (
    <div>
      <div className={styles.headerBar}>
        <div>
          <h1 className={styles.headerTitle}>Tạo kỳ thi mới</h1>
          <p className={styles.headerSubtitle}>Cấu hình lịch, truy cập &amp; bảo mật</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.cancelBtn} onClick={handleCancel}>
            Hủy
          </button>
          <button type="button" className={styles.saveBtn} onClick={handleSave}>
            Lưu kỳ thi
          </button>
        </div>
      </div>

      {/* Thông tin cơ bản */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Thông tin cơ bản</h3>

        <div className={styles.row2}>
          <label className={styles.field}>
            <span className={styles.label}>
              Tên (Tiếng Việt) <span className={styles.required}>*</span>
            </span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Lớp học</span>
            <select value={form.classId} onChange={(e) => update("classId", e.target.value)}>
              <option value="">Liên kết với lớp học (tùy chọn)</option>
              {/* TODO: đổ danh sách lớp thật từ GET /api/classes */}
            </select>
          </label>
        </div>

        <div className={styles.row3}>
          <label className={styles.field}>
            <span className={styles.label}>
              Mở lúc <span className={styles.required}>*</span>
            </span>
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => update("startAt", e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>
              Đóng lúc <span className={styles.required}>*</span>
            </span>
            <input
              type="datetime-local"
              value={form.endAt}
              onChange={(e) => update("endAt", e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Thời lượng (phút)</span>
            <input type="text" value={durationLabel} disabled />
          </label>
        </div>
      </div>

      {/* Bảo mật */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Bảo mật</h3>

        <div className={styles.row3}>
          <div className={styles.toggleField}>
            <span className={styles.label}>Cho phép tham gia</span>
            <ToggleSwitch
              checked={form.allowJoin}
              onChange={(v) => update("allowJoin", v)}
              label="Cho phép tham gia"
            />
          </div>

          <div className={styles.toggleField}>
            <span className={styles.label}>Bật xác minh OTP</span>
            <ToggleSwitch
              checked={form.requireOtp}
              onChange={(v) => update("requireOtp", v)}
              label="Bật xác minh OTP"
            />
          </div>

          <div className={styles.toggleField}>
            <span className={styles.label}>
              Yêu cầu MSSV
              <InfoTooltip text="Chỉ thí sinh đã khai MSSV (kể cả đang chờ duyệt) mới tham gia được." />
            </span>
            <ToggleSwitch
              checked={form.requireStudentId}
              onChange={(v) => update("requireStudentId", v)}
              label="Yêu cầu MSSV"
            />
          </div>
        </div>
      </div>

      {/* Bảng xếp hạng */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Bảng xếp hạng</h3>

        <div className={styles.row3}>
          <label className={styles.field}>
            <span className={styles.label}>Hiển thị log bài nộp</span>
            <select
              value={form.submissionLogVisibility}
              onChange={(e) =>
                update("submissionLogVisibility", e.target.value as SubmissionLogVisibility)
              }
            >
              <option value="private">Riêng tư</option>
              <option value="after_end">Sau khi kết thúc</option>
              <option value="public">Công khai</option>
            </select>
          </label>

          <div className={styles.toggleField}>
            <span className={styles.label}>Ẩn bảng xếp hạng đến khi kết thúc</span>
            <ToggleSwitch
              checked={form.hideLeaderboardUntilEnd}
              onChange={(v) => update("hideLeaderboardUntilEnd", v)}
              label="Ẩn bảng xếp hạng đến khi kết thúc"
            />
          </div>

          <div className={styles.field}>
            <span className={styles.label}>
              Cách tính điểm mỗi bài
              <InfoTooltip text="Không áp dụng cho luyện tập tự do (luôn tính điểm cao nhất)." />
            </span>
            <div className={styles.segmented}>
              <button
                type="button"
                className={`${styles.segmentedBtn} ${
                  form.scoringMode === "best" ? styles.segmentedBtnActive : ""
                }`}
                onClick={() => update("scoringMode", "best")}
              >
                Điểm cao nhất
              </button>
              <button
                type="button"
                className={`${styles.segmentedBtn} ${
                  form.scoringMode === "last" ? styles.segmentedBtnActive : ""
                }`}
                onClick={() => update("scoringMode", "last")}
              >
                Bài nộp cuối
              </button>
            </div>
          </div>
        </div>

        <div className={`${styles.toggleField} ${styles.fullRow}`}>
          <span className={styles.label}>Đóng băng bảng xếp hạng</span>
          <ToggleSwitch
            checked={form.freezeLeaderboard}
            onChange={(v) => update("freezeLeaderboard", v)}
            label="Đóng băng bảng xếp hạng"
          />
        </div>
      </div>
    </div>
  );
}
