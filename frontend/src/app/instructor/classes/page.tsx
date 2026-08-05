import { AppShell } from "@/components/app-shell";
import { ClassesPanel } from "@/components/classes-panel";
import { RequireRole } from "@/lib/auth/require-role";

export default function InstructorClassesPage() {
  return (
    <AppShell activeNav="classes" pageTitle="Lớp học">
      <RequireRole role="instructor">
        <ClassesPanel />
      </RequireRole>
    </AppShell>
  );
}
