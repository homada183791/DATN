import styles from "./dashboard-panel.module.css";

export interface ContributedProblem {
  id: string;
  title: string;
  code: string;
  difficulty: "easy" | "medium" | "hard";
  status: "draft" | "published";
  updatedLabel: string;
}

const difficultyLabel: Record<ContributedProblem["difficulty"], string> = {
  easy: "Dễ",
  medium: "Trung bình",
  hard: "Khó",
};

const difficultyBadgeClass: Record<ContributedProblem["difficulty"], string> = {
  easy: styles.badgeEasy,
  medium: styles.badgeMedium,
  hard: styles.badgeHard,
};

const statusLabel: Record<ContributedProblem["status"], string> = {
  draft: "Nháp",
  published: "Đã đăng",
};

// TODO: thay bằng dữ liệu thật từ GET /api/instructor/problems khi backend sẵn sàng
const problems: ContributedProblem[] = [];

export function ContributedProblemsTable() {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Bài đã đóng góp</h2>
        <div className={styles.panelHeaderActions}>
          <a href="/instructor/problems" className={styles.linkBtn}>
            Xem tất cả
          </a>
          <a href="/instructor/problems/new" className={styles.addBtn}>
            + Bài tập
          </a>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Bài tập</th>
              <th>Độ khó</th>
              <th>Trạng thái</th>
              <th>Cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {problems.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyCell}>
                  Chưa có bài tập nào được đóng góp
                </td>
              </tr>
            ) : (
              problems.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className={styles.problemTitle}>{p.title}</span>
                    <span className={styles.problemCode}>{p.code}</span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${difficultyBadgeClass[p.difficulty]}`}>
                      {difficultyLabel[p.difficulty]}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.statusDotWrap} ${
                        p.status === "published" ? styles.statusPublished : styles.statusDraft
                      }`}
                    >
                      <span className={styles.statusDot} />
                      {statusLabel[p.status]}
                    </span>
                  </td>
                  <td className={styles.updatedCell}>{p.updatedLabel}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
