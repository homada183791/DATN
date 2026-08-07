"use client";

import { ToggleSwitch } from "@/components/toggle-switch";
import { InfoTooltip } from "@/components/info-tooltip";
import styles from "./info-tab.module.css";

export interface ProblemFormState {
  title: string;
  code: string;
  difficulty: "easy" | "medium" | "hard";
  languages: string[];
  category: string;
  problemSet: string;
  timeLimit: string;
  memoryLimit: string;
  maxScore: string;
  hidden: boolean;

  allowPasteOwnCode: boolean;
  allowPasteExternal: boolean;
  allowFileSubmit: boolean;
  allowDebugger: boolean;
  showHiddenTestToOwner: boolean;
  showEditorialToStudents: boolean;

  restrictCpp: boolean;
  restrictPython: boolean;

  gradingEnabled: boolean;
  gradeHiddenTests: boolean;
  hiddenTestExecMode: string;

  statementMarkdown: string;
  statementPdfFileName: string | null;
}

const LANGUAGES = [
  { key: "c11", label: "C11" },
  { key: "cpp17", label: "C++17" },
  { key: "python3", label: "Python 3" },
  { key: "csharp", label: "C#" },
  { key: "java17", label: "Java 17" },
  { key: "javascript", label: "JavaScript" },
];

const DIFFICULTIES: { key: ProblemFormState["difficulty"]; label: string }[] = [
  { key: "easy", label: "Dễ" },
  { key: "medium", label: "Trung bình" },
  { key: "hard", label: "Khó" },
];

export function InfoTab({
  form,
  setForm,
}: {
  form: ProblemFormState;
  setForm: (updater: (prev: ProblemFormState) => ProblemFormState) => void;
}) {
  function update<K extends keyof ProblemFormState>(key: K, value: ProblemFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleLanguage(key: string) {
    setForm((prev) => ({
      ...prev,
      languages: prev.languages.includes(key)
        ? prev.languages.filter((l) => l !== key)
        : [...prev.languages, key],
    }));
  }

  return (
    <div>
      <div className={styles.grid2}>
        {/* Thông tin cơ bản */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Thông tin cơ bản</h3>

          <div className={styles.fieldsGrid}>
            <label className={styles.field}>
              <span className={styles.label}>
                Tên bài <span className={styles.required}>*</span>
              </span>
              <input
                type="text"
                placeholder="Ví dụ: Tổng hai số"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>
                Mã bài <span className={styles.required}>*</span>
              </span>
              <input
                type="text"
                placeholder="A001"
                value={form.code}
                onChange={(e) => update("code", e.target.value.toUpperCase())}
              />
            </label>

            <div className={`${styles.field} ${styles.fieldFull}`}>
              <span className={styles.label}>
                Độ khó <span className={styles.required}>*</span>
              </span>
              <div className={styles.segmented}>
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    className={`${styles.segmentedBtn} ${
                      form.difficulty === d.key ? styles.segmentedBtnActive : ""
                    }`}
                    onClick={() => update("difficulty", d.key)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`${styles.field} ${styles.fieldFull}`}>
              <span className={styles.label}>
                Ngôn ngữ cho phép <span className={styles.required}>*</span>
              </span>
              <div className={styles.langList}>
                {LANGUAGES.map((lang) => {
                  const active = form.languages.includes(lang.key);
                  return (
                    <button
                      key={lang.key}
                      type="button"
                      className={`${styles.langChip} ${active ? styles.langChipActive : ""}`}
                      onClick={() => toggleLanguage(lang.key)}
                    >
                      <span className={styles.langCheckIcon}>
                        {active && <CheckIcon />}
                      </span>
                      {lang.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className={styles.field}>
              <span className={styles.label}>Danh mục</span>
              <input
                type="text"
                placeholder="Ví dụ: Mảng"
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Bộ bài tập</span>
              <select
                value={form.problemSet}
                onChange={(e) => update("problemSet", e.target.value)}
              >
                <option value="">Gán vào bộ bài tập...</option>
                {/* TODO: đổ danh sách bộ bài tập thật từ GET /api/problem-sets */}
              </select>
            </label>
          </div>
        </div>

        {/* Giới hạn & hiển thị */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Giới hạn &amp; hiển thị</h3>

          <div className={styles.fieldsGrid}>
            <label className={styles.field}>
              <span className={styles.label}>
                Giới hạn thời gian <span className={styles.required}>*</span>
              </span>
              <div className={styles.inputWithSuffix}>
                <input
                  type="number"
                  min={0}
                  value={form.timeLimit}
                  onChange={(e) => update("timeLimit", e.target.value)}
                />
                <span className={styles.suffix}>ms</span>
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>
                Giới hạn bộ nhớ <span className={styles.required}>*</span>
              </span>
              <div className={styles.inputWithSuffix}>
                <input
                  type="number"
                  min={0}
                  value={form.memoryLimit}
                  onChange={(e) => update("memoryLimit", e.target.value)}
                />
                <span className={styles.suffix}>MB</span>
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>
                Điểm tối đa <span className={styles.required}>*</span>
              </span>
              <input
                type="number"
                min={0}
                value={form.maxScore}
                onChange={(e) => update("maxScore", e.target.value)}
              />
            </label>

            <div className={`${styles.field} ${styles.fieldFull}`}>
              <span className={styles.label}>Ẩn khỏi công khai</span>
              <div className={styles.toggleRow}>
                <ToggleSwitch
                  checked={form.hidden}
                  onChange={(v) => update("hidden", v)}
                  label="Ẩn khỏi công khai"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 panel cấu hình */}
      <div className={styles.configGrid}>
        <div className={styles.configPanel}>
          <h3 className={styles.cardTitle}>Kiểm soát truy cập</h3>

          <ConfigToggle
            label="Cho phép dán lại code copy trong editor"
            checked={form.allowPasteOwnCode}
            onChange={(v) => update("allowPasteOwnCode", v)}
          />
          <ConfigToggle
            label="Cho phép dán từ bên ngoài"
            checked={form.allowPasteExternal}
            onChange={(v) => update("allowPasteExternal", v)}
          />
          <ConfigToggle
            label="Cho phép nộp bài bằng tải file"
            checked={form.allowFileSubmit}
            onChange={(v) => update("allowFileSubmit", v)}
          />
          <ConfigToggle
            label="Cho phép Debugger"
            checked={form.allowDebugger}
            onChange={(v) => update("allowDebugger", v)}
          />
          <ConfigToggle
            label="Cho thí sinh xem input/expected của test ẩn trên bài nộp của chính họ"
            checked={form.showHiddenTestToOwner}
            onChange={(v) => update("showHiddenTestToOwner", v)}
            help="Mặc định TẮT. Bật khi dùng cho luyện tập — không áp dụng trong contest đang diễn ra."
          />
          <ConfigToggle
            label="Hiển thị lời giải cho học viên"
            checked={form.showEditorialToStudents}
            onChange={(v) => update("showEditorialToStudents", v)}
            help="Khi bật, học viên đã AC bài mới xem được lời giải/nút Xem lời giải; khi tắt, ẩn hoàn toàn."
          />
        </div>

        <div className={styles.configPanel}>
          <h3 className={styles.cardTitle}>Ràng buộc bài làm</h3>

          <ConfigToggle
            label="C++"
            checked={form.restrictCpp}
            onChange={(v) => update("restrictCpp", v)}
          />
          <ConfigToggle
            label="Python"
            checked={form.restrictPython}
            onChange={(v) => update("restrictPython", v)}
          />
        </div>

        <div className={styles.configPanel}>
          <h3 className={styles.cardTitle}>Cấu hình chấm bài</h3>

          <ConfigToggle
            label="Bật chấm bài"
            checked={form.gradingEnabled}
            onChange={(v) => update("gradingEnabled", v)}
            tooltip="Sinh viên vẫn nộp được bài nhưng KHÔNG được chấm (bài giữ trạng thái chờ). Bật lại KHÔNG tự động chấm các bài đã nộp trong lúc tắt."
          />
          <ConfigToggle
            label="Chấm test ẩn"
            checked={form.gradeHiddenTests}
            onChange={(v) => update("gradeHiddenTests", v)}
            tooltip="Chỉ chạy và chấm nhóm test mẫu (sample); test ẩn không được chấm."
          />

          <div>
            <div className={styles.configSelectLabel}>
              Chế độ thực thi test ẩn
              <InfoTooltip text="Áp dụng khi 'Chấm test ẩn' đang TẮT. [Chạy nền]: test ẩn vẫn chạy ngầm mỗi lần nộp bài (không tính điểm/không hiện) để có thể bật lại + tính điểm ngay sau đó, KHÔNG cần chấm lại. [Chờ chấm lại]: test ẩn KHÔNG chạy; muốn lấy kết quả phải bấm chấm lại (chạy lại toàn bộ)." />
            </div>
            <select
              className={styles.configSelect}
              value={form.hiddenTestExecMode}
              onChange={(e) => update("hiddenTestExecMode", e.target.value)}
            >
              <option value="background">Chạy nền (mặc định)</option>
              <option value="wait_regrade">Chờ chấm lại</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigToggle({
  label,
  checked,
  onChange,
  help,
  tooltip,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  help?: string;
  tooltip?: string;
}) {
  return (
    <div className={styles.configOption}>
      <ToggleSwitch checked={checked} onChange={onChange} label={label} />
      <div className={styles.configOptionText}>
        <div className={styles.configOptionLabelRow}>
          {label}
          {tooltip && <InfoTooltip text={tooltip} />}
        </div>
        {help && <p className={styles.configOptionHelp}>{help}</p>}
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
