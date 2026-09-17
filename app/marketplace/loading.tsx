import { PageShell } from "@/components/page-shell";
import { AgentCardSkeleton } from "@/components/ui/skeleton";

export default function MarketplaceLoading() {
  return (
    <PageShell
      width="wide"
      eyebrow="Marktplatz"
      title="Agenten mieten"
      description="Katalog wird vorbereitet."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <AgentCardSkeleton key={index} />
        ))}
      </div>
    </PageShell>
  );
}
