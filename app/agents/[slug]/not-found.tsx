import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/page-shell";

export default function AgentNotFound() {
  return (
    <PageShell title="Profil nicht gefunden" description="">
      <EmptyState
        title="Dieser Agent existiert in den UI-Fixtures nicht."
        description="Der Marktplatz listet nur die vorliegenden Entwurfsprofile. Es gibt keinen weiteren Bestand."
        actionHref="/marketplace"
        actionLabel="Zum Marktplatz"
      />
    </PageShell>
  );
}
