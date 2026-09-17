import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Marketplace",
};

export default function MarketplacePage() {
  return (
    <PageShell
      title="Marketplace"
      description="Agent listings will render here. No catalog data is loaded in this foundation."
    >
      <p className="text-sm text-muted">
        Detail pages will live at{" "}
        <code className="font-mono text-foreground">/agents/[slug]</code>. Route
        shell:{" "}
        <Link className="underline underline-offset-4" href="/agents/example">
          /agents/example
        </Link>
        .
      </p>
    </PageShell>
  );
}
