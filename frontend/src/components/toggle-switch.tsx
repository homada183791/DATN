"use client";

import styles from "./toggle-switch.module.css";

export function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`${styles.track} ${checked ? styles.trackOn : ""} ${
        disabled ? styles.trackDisabled : ""
      }`}
      onClick={() => !disabled && onChange?.(!checked)}
    >
      <span className={styles.thumb} />
    </button>
  );
}
