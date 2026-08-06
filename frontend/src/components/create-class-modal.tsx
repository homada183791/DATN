"use client";

import { useState, type FormEvent } from "react";
import styles from "./create-class-modal.module.css";
import { useToast } from "./toast-context";

interface CreateClassModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateClassModal({ open, onClose }: CreateClassModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [semester, setSemester] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  if (!open) return null;

  function reset() {
    setName("");
    setDescription("");
    setCode("");
    setSemester("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập tên lớp.");
      return;
    }

    // TODO: nối API thật — POST /api/classes { name, description, code, semester }
    showToast(`Đã tạo lớp "${name}" — chức năng lưu thật đang chờ nối API.`);
    handleClose();
  }

  return (
    <div className={styles.backdrop} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Tạo lớp</h2>
          <button type="button" className={styles.closeBtn} onClick={handleClose}>
            ×
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>
              Tên lớp <span className={styles.required}>*</span>
            </span>
            <input
              type="text"
              placeholder="Nhập tên lớp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {error && <p className={styles.errorText}>{error}</p>}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Mô tả</span>
            <textarea
              placeholder="Mô tả lớp (tùy chọn)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Mã lớp</span>
            <input
              type="text"
              placeholder="VD: CS101 (tùy chọn)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Học kỳ</span>
            <input
              type="text"
              placeholder="VD: HK1 2025-2026 (tùy chọn)"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            />
          </label>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={handleClose}>
              Hủy
            </button>
            <button type="submit" className={styles.confirmBtn}>
              Tạo lớp
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
