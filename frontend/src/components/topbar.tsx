import styles from "./topbar.module.css";
import { ThemeSwitcher } from "./theme-switcher";
import { LanguageSwitcher } from "./language-switcher";

export function Topbar({
  pageTitle,
  onLoginClick,
}: {
  pageTitle: string;
  onLoginClick: () => void;
}) {
  return (
    <header className={styles.topbar}>
      <span className={styles.breadcrumb}>
        JudgeHub / <span className={styles.breadcrumbActive}>{pageTitle}</span>
      </span>

      <div className={styles.search}>
        <SearchIcon />
        <span>Tìm bài tập, người dùng…</span>
        <kbd>⌘K</kbd>
      </div>

      <span className={styles.spacer} />

      <ThemeSwitcher />
      <LanguageSwitcher />

      <button type="button" className={styles.loginBtn} onClick={onLoginClick}>
        <LoginIcon />
        Đăng nhập
      </button>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LoginIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
