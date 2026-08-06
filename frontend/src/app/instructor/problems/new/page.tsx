import { AppShell } from "@/components/app-shell";
import { ProblemEditor } from "@/components/problem-editor/problem-editor";
import { RequireRole } from "@/lib/auth/require-role";

export default function NewProblemPage() {
  return (
    <AppShell activeNav="problems" pageTitle="Bài tập">
      <RequireRole role="instructor">
        <ProblemEditor />
      </RequireRole>
    </AppShell>
  );
}
