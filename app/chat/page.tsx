import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { ChatClient } from "@/components/chat-client";
import { getVerifiedSession } from "@/lib/auth/server";
import { isDatabaseConfigured } from "@/lib/catalog/queries";
import { listRentals, getRentalForUser, rentalIsActive } from "@/lib/runtime/rentals";
import { getOrCreateOpenSession, listSessionRuns } from "@/lib/runtime/runs";

export const metadata: Metadata = {
  title: "Chat",
};

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: PageProps<"/chat">) {
  const params = await searchParams;
  const rentalId =
    typeof params.rentalId === "string" ? params.rentalId : undefined;
  const session = await getVerifiedSession();

  if (!session?.user) {
    return (
      <PageShell
        title="Chat"
        description="Sign in to send a message in an active rental session."
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
        title="Chat"
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
        title="Chat"
        description="Pick an active unpaid access rental. Stripe checkout is not implemented."
      >
        {active.length === 0 ? (
          <p className="text-sm text-muted">
            No active rentals.{" "}
            <Link className="underline underline-offset-4" href="/marketplace">
              Browse the catalog
            </Link>{" "}
            and start unpaid access from an agent page.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {active.map((row) => (
              <li key={row.id}>
                <Link
                  className="underline underline-offset-4"
                  href={`/chat?rentalId=${row.id}`}
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
        title="Chat"
        description="That rental is missing or no longer active."
      >
        <Link className="text-sm underline underline-offset-4" href="/chat">
          Choose another rental
        </Link>
      </PageShell>
    );
  }

  const opened = await getOrCreateOpenSession({
    userId: session.user.id,
    rentalId,
  });
  if (!opened.ok) {
    return (
      <PageShell title="Chat" description={opened.error}>
        <Link className="text-sm underline underline-offset-4" href="/chat">
          Back
        </Link>
      </PageShell>
    );
  }

  const runs = await listSessionRuns(session.user.id, opened.data.session.id);

  return (
    <PageShell
      title={bundle.agent.name}
      description="Authenticated streaming chat. Each turn is stored as an agent_run with model_id_used and skill_version."
    >
      <ChatClient
        rentalId={rentalId}
        sessionId={opened.data.session.id}
        agentName={bundle.agent.name}
        initialRuns={runs.map((run) => ({
          id: run.id,
          status: run.status,
          modelIdUsed: run.modelIdUsed,
          skillVersion: run.skillVersion,
          input: run.input as { message?: unknown } | null,
          output: run.output as { text?: unknown; error?: unknown } | null,
        }))}
      />
    </PageShell>
  );
}
