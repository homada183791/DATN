import styles from "./info-tooltip.module.css";

export function InfoTooltip({ text }: { text: string }) {
  return (
    <span className={styles.wrap} tabIndex={0}>
      <InfoIcon />
      <span role="tooltip" className={styles.bubble}>
        {text}
      </span>
    </span>
  );
}

function InfoIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 11v5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="8" r="0.9" fill="currentColor" />
    </svg>
  );
}
