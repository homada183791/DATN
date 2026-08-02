import { AppShell } from "@/components/app-shell";
import { ContestsPanel } from "@/components/contests-panel";

export default function ContestsPage() {
  return (
    <AppShell activeNav="contests" pageTitle="Cuộc thi">
      <ContestsPanel />
    </AppShell>
  );
}
