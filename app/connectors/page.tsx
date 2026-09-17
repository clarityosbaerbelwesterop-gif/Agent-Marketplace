import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { ConnectorPanel } from "@/components/connector-panel";
import { connectorCatalog, listConnectorGrants } from "@/lib/connectors";
import { getVerifiedSession } from "@/lib/auth/server";
import { isDatabaseConfigured } from "@/lib/catalog/queries";
import { listRentals, getRentalForUser, rentalIsActive } from "@/lib/runtime/rentals";

export const metadata: Metadata = {
  title: "Connectors",
};

export const dynamic = "force-dynamic";

export default async function ConnectorsPage({
  searchParams,
}: PageProps<"/connectors">) {
  const params = await searchParams;
  const rentalId =
    typeof params.rentalId === "string" ? params.rentalId : undefined;
  const connected =
    typeof params.connected === "string" ? params.connected : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;
  const session = await getVerifiedSession();

  if (!session?.user) {
    return (
      <PageShell
        title="Connectors"
        description="Sign in to grant Neon, GitHub, Slack, Vercel, Supabase, Render, Stripe, or Cursor access during a rental."
      >
        <Link className="text-sm underline underline-offset-4" href="/login">
          Sign in
        </Link>
      </PageShell>
    );
  }

  if (!isDatabaseConfigured()) {
    return (
      <PageShell
        title="Connectors"
        description="Catalog database is not configured on this server."
      />
    );
  }

  if (!rentalId) {
    const rentals = await listRentals(session.user.id);
    const active = rentals.filter((row) =>
      rentalIsActive({
        status: row.status,
        startsAt: row.startsAt ? new Date(row.startsAt) : null,
        endsAt: row.endsAt ? new Date(row.endsAt) : null,
      }),
    );
    return (
      <PageShell
        title="Connectors"
        description="Pick an active rental. Grants are stored per user and workspace, not as Grok Bot plugins."
      >
        {active.length === 0 ? (
          <p className="text-sm text-muted">
            No active rentals.{" "}
            <Link className="underline underline-offset-4" href="/marketplace">
              Browse the catalog
            </Link>{" "}
            and pay with Stripe Checkout from an agent page.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {active.map((row) => (
              <li key={row.id}>
                <Link
                  className="underline underline-offset-4"
                  href={`/connectors?rentalId=${row.id}`}
                >
                  {row.agentName}
                </Link>
                <span className="text-muted"> · {row.agentTier}</span>
              </li>
            ))}
          </ul>
        )}
      </PageShell>
    );
  }

  const bundle = await getRentalForUser(session.user.id, rentalId);
  if (!bundle || !rentalIsActive(bundle.rental)) {
    return (
      <PageShell
        title="Connectors"
        description="That rental is missing or no longer active."
      >
        <Link className="text-sm underline underline-offset-4" href="/connectors">
          Choose another rental
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Connectors"
      description={`Tenant grants for ${bundle.agent.name}. OAuth callbacks stay pending until the provider returns a token. API-key connectors stay pending until secrets are stored.`}
    >
      {connected ? (
        <p className="text-sm">Connected {connected}.</p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-sm text-muted">
        Back to{" "}
        <Link
          className="underline underline-offset-4"
          href={`/chat?rentalId=${rentalId}`}
        >
          chat
        </Link>
        .
      </p>
      <ConnectorPanel
        rentalId={rentalId}
        items={connectorCatalog(
          await listConnectorGrants(session.user.id, bundle.rental.workspaceId),
        )}
      />
    </PageShell>
  );
}
