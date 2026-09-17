import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { ConnectorDiscoverSearch } from "@/components/connector-discover-search";
import { DISCOVERY_SOURCES } from "@/lib/connectors/discovery";

export const metadata: Metadata = {
  title: "MCP discovery",
};

export default function ConnectorDiscoverPage() {
  return (
    <PageShell
      title="MCP discovery"
      description="Catalog-only search of the official MCP registry and curated GitHub topics. Nothing here is auto-installed or granted. Runtime connectors remain the first-wave eight."
    >
      <ul className="text-sm text-muted">
        {DISCOVERY_SOURCES.map((source) => (
          <li key={source.id}>
            {source.name} — {source.notes}{" "}
            <a
              className="underline underline-offset-4"
              href={source.docs}
              rel="noreferrer"
              target="_blank"
            >
              docs
            </a>
          </li>
        ))}
      </ul>
      <ConnectorDiscoverSearch />
      <p className="text-sm text-muted">
        Grantable connectors live on{" "}
        <Link className="underline underline-offset-4" href="/connectors">
          /connectors
        </Link>
        .
      </p>
    </PageShell>
  );
}
