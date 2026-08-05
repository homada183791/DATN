import { AppShell } from "@/components/app-shell";
import { SubmissionsPanel } from "@/components/submissions-panel";
import { RequireRole } from "@/lib/auth/require-role";

export default function InstructorSubmissionsPage() {
  return (
    <AppShell activeNav="submissions" pageTitle="Bài nộp">
      <RequireRole role="instructor">
        <SubmissionsPanel />
      </RequireRole>
    </AppShell>
  );
}