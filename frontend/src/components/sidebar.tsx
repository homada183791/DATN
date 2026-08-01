import styles from "./sidebar.module.css";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  active: "problems" | "contests" | "guide";
}

const navItems = [
  { key: "problems", label: "Bài tập", href: "/", icon: <MonitorIcon /> },
  { key: "contests", label: "Cuộc thi", href: "/contests", icon: <TrophyIcon /> },
  { key: "guide", label: "Hướng dẫn sử dụng", href: "/guide", icon: <BookIcon /> },
] as const;

export function Sidebar({ collapsed, onToggle, active }: SidebarProps) {
  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.logoRow}>
        <img src="/logo-hcmus.png" alt="HCMUS" className={styles.logoBadge} />
        {!collapsed && (
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>JudgeHub</span>
            <span className={styles.logoSubtitle}>University of Science</span>
          </div>
        )}
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => (
          <a
            key={item.key}
            href={item.href}
            className={`${styles.navItem} ${
              active === item.key ? styles.navItemActive : ""
            }`}
            title={collapsed ? item.label : undefined}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {!collapsed && item.label}
          </a>
        ))}
      </nav>

      <button
        type="button"
        className={styles.collapseBtn}
        onClick={onToggle}
        aria-label={collapsed ? "Mở rộng" : "Thu gọn"}
      >
        {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        {!collapsed && "Thu gọn"}
      </button>
    </aside>
  );
}

function MonitorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 4h10v5a5 5 0 01-10 0V4z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M7 5H4a1 1 0 000 2 3 3 0 003 3M17 5h3a1 1 0 010 2 3 3 0 01-3 3M10 15v3H8v2h8v-2h-2v-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 15.5v-10z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M4 15.5A2.5 2.5 0 006.5 18H20" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
