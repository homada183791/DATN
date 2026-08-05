import styles from "./dashboard-panel.module.css";

// TODO: thay bằng dữ liệu thật từ GET /api/instructor/contests?upcoming=true
const upcomingContests: { id: string; title: string }[] = [];

export function UpcomingContestsPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Cuộc thi sắp tới</h2>
      </div>

      {upcomingContests.length === 0 ? (
        <p className={styles.emptyPanelBody}>Chưa có gì ở đây</p>
      ) : (
        <ul>
          {upcomingContests.map((c) => (
            <li key={c.id}>{c.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
