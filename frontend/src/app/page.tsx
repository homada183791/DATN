import { AppShell } from "@/components/app-shell";
import { ProblemsPanel } from "@/components/problems-panel";

export default function HomePage() {
  return (
    <AppShell activeNav="problems" pageTitle="Bài tập">
      <ProblemsPanel />
    </AppShell>
  );
}
