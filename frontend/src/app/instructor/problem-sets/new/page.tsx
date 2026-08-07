import { AppShell } from "@/components/app-shell";
import { CreateProblemSetPanel } from "@/components/create-problem-set-panel";
import { RequireRole } from "@/lib/auth/require-role";

export default function NewProblemSetPage() {
  return (
    <AppShell activeNav="problems" pageTitle="Bộ bài tập">
      <RequireRole role="instructor">
        <CreateProblemSetPanel />
      </RequireRole>
    </AppShell>
  );
}
