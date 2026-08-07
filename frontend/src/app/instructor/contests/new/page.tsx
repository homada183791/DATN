import { AppShell } from "@/components/app-shell";
import { CreateContestPanel } from "@/components/create-contest-panel";
import { RequireRole } from "@/lib/auth/require-role";

export default function NewContestPage() {
  return (
    <AppShell activeNav="contests" pageTitle="Cuộc thi">
      <RequireRole role="instructor">
        <CreateContestPanel />
      </RequireRole>
    </AppShell>
  );
}
