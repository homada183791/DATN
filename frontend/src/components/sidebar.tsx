import Image from "next/image";
import styles from "./sidebar.module.css";

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  active: string;
  navItems: NavItem[];
}

export function Sidebar({ collapsed, onToggle, active, navItems }: SidebarProps) {
  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.logoRow}>
        <Image
          src="/logo-hcmus.png"
          alt="HCMUS"
          width={32}
          height={32}
          className={styles.logoBadge}
          priority
        />
        {!collapsed && (
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>JudgeHub</span>
            <span className={styles.logoSubtitle}>University Of Science</span>
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
