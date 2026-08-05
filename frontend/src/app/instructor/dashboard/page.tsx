import { AppShell } from "@/components/app-shell";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { RequireRole } from "@/lib/auth/require-role";
import { instructorNavItems } from "@/lib/nav-items";

export default function InstructorDashboardPage() {
  return (
    <AppShell
      activeNav="dashboard"
      pageTitle="Bảng điều khiển"
      navItems={instructorNavItems}
    >
      {/* Không hiện thông báo "không có quyền" — 2 vai trò là 2 màn hình
          tách biệt hoàn toàn, middleware đã redirect về "/" trước khi tới
          được đây trong hầu hết trường hợp. RequireRole chỉ là lớp an toàn
          dự phòng, nên fallback để trống thay vì hiện chữ giải thích. */}
      <RequireRole role="instructor">
        <DashboardPanel />
      </RequireRole>
    </AppShell>
  );
}
