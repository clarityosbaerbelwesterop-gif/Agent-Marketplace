import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/page-shell";

export default function NotFound() {
  return (
    <PageShell title="Seite nicht gefunden">
      <EmptyState
        title="Diese Route gibt es nicht."
        description="Zurück zum Marktplatz oder zur Startseite."
        actionHref="/marketplace"
        actionLabel="Zum Marktplatz"
      />
    </PageShell>
  );
}
