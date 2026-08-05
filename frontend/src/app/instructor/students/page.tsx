import { AppShell } from "@/components/app-shell";
import { StudentsPanel } from "@/components/students-panel";
import { RequireRole } from "@/lib/auth/require-role";

export default function InstructorStudentsPage() {
  return (
    <AppShell activeNav="students" pageTitle="Sinh viên">
      <RequireRole role="instructor">
        <StudentsPanel />
      </RequireRole>
    </AppShell>
  );
}
