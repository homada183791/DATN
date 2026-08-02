import styles from "./toast.module.css";

export function Toast({ message }: { message: string }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.toast} role="alert">
        <span className={styles.icon}>
          <ErrorIcon />
        </span>
        <span>{message}</span>
      </div>
    </div>
  );
}

function ErrorIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
