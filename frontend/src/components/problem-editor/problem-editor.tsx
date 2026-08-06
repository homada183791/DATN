"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./problem-editor.module.css";
import { InfoTab, type ProblemFormState } from "./info-tab";
import { useToast } from "@/components/toast-context";

const DRAFT_KEY = "judgehub_problem_draft";

const emptyForm: ProblemFormState = {
  title: "",
  code: "",
  difficulty: "easy",
  languages: [],
  category: "",
  problemSet: "",
  timeLimit: "1000",
  memoryLimit: "256",
  maxScore: "100",
  hidden: false,

  allowPasteOwnCode: true,
  allowPasteExternal: true,
  allowFileSubmit: true,
  allowDebugger: true,
  showHiddenTestToOwner: false,
  showEditorialToStudents: true,

  restrictCpp: false,
  restrictPython: false,

  gradingEnabled: true,
  gradeHiddenTests: true,
  hiddenTestExecMode: "background",
};

const tabs = [
  { key: "info", label: "Thông tin" },
  { key: "statement", label: "Nội dung đề" },
  { key: "solution", label: "Lời giải mẫu" },
  { key: "editorial", label: "Editorial" },
  { key: "tests", label: "Bộ test" },
  { key: "checker", label: "Checker" },
  { key: "boilerplate", label: "Mẫu khởi tạo" },
  { key: "history", label: "Lịch sử" },
  { key: "comments", label: "Bình luận" },
];

export function ProblemEditor() {
  const [tab, setTab] = useState("info");
  const [form, setForm] = useState<ProblemFormState>(emptyForm);
  const [draftRestored, setDraftRestored] = useState(false);
  const { showToast } = useToast();
  const hasLoadedDraft = useRef(false);

  // Khôi phục bản nháp lưu cục bộ (nếu có) khi mở trang
  useEffect(() => {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        setForm(JSON.parse(raw));
        setDraftRestored(true);
      } catch {
        window.localStorage.removeItem(DRAFT_KEY);
      }
    }
    hasLoadedDraft.current = true;
  }, []);

  // Tự lưu bản nháp mỗi khi form thay đổi
  useEffect(() => {
    if (!hasLoadedDraft.current) return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  function handleDiscardDraft() {
    window.localStorage.removeItem(DRAFT_KEY);
    setForm(emptyForm);
    setDraftRestored(false);
  }

  function handleSave() {
    // TODO: nối API thật — POST /api/problems (lưu nháp, status = "draft")
    showToast("Đã lưu nháp — chức năng lưu thật đang chờ nối API.");
  }

  function handleSubmit() {
    // TODO: nối API thật — POST /api/problems (gửi duyệt, status = "pending_review")
    if (!form.title.trim() || !form.code.trim() || form.languages.length === 0) {
      showToast("Vui lòng điền đủ Tên bài, Mã bài và chọn ít nhất 1 ngôn ngữ.");
      return;
    }
    showToast("Đã gửi duyệt — chức năng gửi thật đang chờ nối API.");
  }

  return (
    <div>
      <div className={styles.headerBar}>
        <div className={styles.headerLeft}>
          <h1 className={styles.headerTitle}>Soạn đề</h1>
          <span className={styles.statusBadge}>
            <span className={styles.statusDot} />
            Nháp
          </span>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.saveBtn} onClick={handleSave}>
            Lưu
          </button>
          <button type="button" className={styles.submitBtn} onClick={handleSubmit}>
            Gửi duyệt
          </button>
        </div>
      </div>

      {draftRestored && (
        <div className={styles.draftBanner}>
          <span className={styles.draftBannerLeft}>
            <InfoBannerIcon />
            Đã khôi phục bản nháp
          </span>
          <button type="button" className={styles.discardDraftBtn} onClick={handleDiscardDraft}>
            Bỏ bản nháp cục bộ
          </button>
        </div>
      )}

      <div className={styles.tabs} role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.tabPanel}>
        {tab === "info" ? (
          <InfoTab form={form} setForm={setForm} />
        ) : (
          <div className={styles.stubPanel}>
            Phần &quot;{tabs.find((t) => t.key === tab)?.label}&quot; đang được xây dựng.
          </div>
        )}
      </div>
    </div>
  );
}

function InfoBannerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11v5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="8" r="1" fill="currentColor" />
    </svg>
  );
}
