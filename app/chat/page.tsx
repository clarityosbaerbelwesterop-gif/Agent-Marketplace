import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { ChatClient } from "@/components/chat-client";
import { EndRentalForm } from "@/components/end-rental-form";
import { PaymentPendingNotice } from "@/components/payment-pending-notice";
import { RenewRentalForm } from "@/components/renew-rental-form";
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
        description="Pick an active paid rental. Chat rejects pending, canceled, and expired windows."
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
  if (!bundle) {
    return (
      <PageShell
        title="Chat"
        description="That rental is missing."
      >
        <Link className="text-sm underline underline-offset-4" href="/chat">
          Choose another rental
        </Link>
      </PageShell>
    );
  }

  if (bundle.rental.status === "pending") {
    return (
      <PageShell
        title={bundle.agent.name}
        description="Payment is not confirmed yet. The Checkout success URL does not activate this rental."
      >
        <PaymentPendingNotice rentalId={rentalId} />
        <Link
          className="text-sm underline underline-offset-4"
          href={`/checkout?rentalId=${rentalId}`}
        >
          Resume checkout
        </Link>
      </PageShell>
    );
  }

  if (!rentalIsActive(bundle.rental)) {
    const durations = bundle.agent.rentalOptions.durations ?? [];
    const ended = bundle.rental.status === "canceled";
    return (
      <PageShell
        title="Chat"
        description={
          ended
            ? "This rental has ended. Chat rejects ended rentals."
            : "That rental is not active or has expired."
        }
      >
        {ended ? (
          <p className="text-sm text-muted">
            Ended
            {bundle.rental.endedAt
              ? ` at ${bundle.rental.endedAt.toISOString()}`
              : ""}
            {bundle.rental.endReason ? ` (${bundle.rental.endReason})` : ""}.
          </p>
        ) : (
          <RenewRentalForm
            rentalId={rentalId}
            durations={durations.map((duration) => ({
              id: duration.id,
              label: duration.label,
            }))}
          />
        )}
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
  const durations = bundle.agent.rentalOptions.durations ?? [];

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
      <RenewRentalForm
        rentalId={rentalId}
        durations={durations.map((duration) => ({
          id: duration.id,
          label: duration.label,
        }))}
      />
      <EndRentalForm rentalId={rentalId} />
    </PageShell>
  );
}
