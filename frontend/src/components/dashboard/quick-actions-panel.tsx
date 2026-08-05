import styles from "./dashboard-panel.module.css";
import { MonitorIcon, TrophyIcon, GraduationCapIcon } from "@/components/nav-icons";

const actions = [
  { key: "problems", label: "Bài tập", href: "/", icon: <MonitorIcon /> },
  { key: "contests", label: "Cuộc thi", href: "/contests", icon: <TrophyIcon /> },
  { key: "classes", label: "Lớp học", href: "/instructor/classes", icon: <GraduationCapIcon /> },
];

export function QuickActionsPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Thao tác nhanh</h2>
      </div>

      <div className={styles.quickActions}>
        {actions.map((a) => (
          <a key={a.key} href={a.href} className={styles.quickActionBtn}>
            <span className={styles.quickActionIcon}>{a.icon}</span>
            {a.label}
          </a>
        ))}
      </div>
    </div>
  );
}
