import type { Metadata } from "next";
import { ChatClient } from "@/components/chat-client";
import { EndRentalForm } from "@/components/end-rental-form";
import { GroupChatStart } from "@/components/group-chat-start";
import { PaymentPendingNotice } from "@/components/payment-pending-notice";
import { RenewRentalForm } from "@/components/renew-rental-form";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { getVerifiedSession } from "@/lib/auth/server";
import { agentTypeForCategory } from "@/lib/catalog/agent-types";
import { isDatabaseConfigured } from "@/lib/catalog/queries";
import {
  getRentalForUser,
  listRentals,
  rentalIsActive,
} from "@/lib/runtime/rentals";
import { getOrCreateOpenSession, listSessionRuns } from "@/lib/runtime/runs";
import { getSessionForUser, listGroupMembers } from "@/lib/runtime/rooms";
import {
  getFailoverPresentation,
  getMemoryNetworkPresentation,
} from "@/lib/runtime/status";
import { chatRentalHref, groupChatHref, rentalCheckoutHref } from "@/lib/urls";
import { firstSearchParam } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Chat",
  description:
    "Chathub für eine bezahlte Miete. Der Modell-Router streamt, sobald ein Key gesetzt ist; Failover ist optional. Gruppenchat bei mehreren aktiven Mieten.",
};

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: PageProps<"/chat">) {
  const params = await searchParams;
  const rentalId = firstSearchParam(params.rentalId);
  const sessionIdParam = firstSearchParam(params.sessionId);
  const session = await getVerifiedSession();
  const failover = getFailoverPresentation();
  const memoryNetwork = getMemoryNetworkPresentation();

  if (!session?.user) {
    return (
      <PageShell
        title="Chat"
        description="Melden Sie sich an, um in einer aktiven Miete zu schreiben."
      >
        <EmptyState
          title="Anmeldung nötig"
          description="Der Chathub hängt an einer verifizierten Sitzung."
          actionHref="/login"
          actionLabel="Anmelden"
        />
      </PageShell>
    );
  }

  if (!isDatabaseConfigured()) {
    return (
      <PageShell
        title="Chat"
        description="Ohne DATABASE_URL gibt es keine Miet-Sitzungen."
      />
    );
  }

  if (!rentalId && !sessionIdParam) {
    const rentals = await listRentals(session.user.id);
    const active = rentals.filter((row) =>
      rentalIsActive({
        status: row.status,
        startsAt: row.startsAt ? new Date(row.startsAt) : null,
        endsAt: row.endsAt ? new Date(row.endsAt) : null,
      }),
    );
    const groupCandidates = active.filter((row) =>
      Boolean(agentTypeForCategory(row.agentCategory ?? "")),
    );
    return (
      <PageShell
        title="Chat"
        description="Wählen Sie eine aktive, per Webhook bestätigte Miete — oder starten Sie eine Gruppensitzung mit mehreren bezahlten Mietfenstern. Ausstehend, storniert und abgelaufen werden abgelehnt."
        actions={
          groupCandidates.length >= 2 ? (
            <ButtonLink href={groupChatHref()} variant="secondary">
              Gruppenchat
            </ButtonLink>
          ) : undefined
        }
      >
        {active.length === 0 ? (
          <EmptyState
            title="Keine aktive Miete"
            description="Bezahlen Sie auf einem Agentenprofil. Der Erfolg-Redirect allein aktiviert die Miete nicht."
            actionHref="/marketplace"
            actionLabel="Marktplatz öffnen"
          />
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {active.map((row) => (
              <li key={row.id}>
                <ButtonLink href={chatRentalHref(row.id)} variant="secondary">
                  {row.agentName}
                </ButtonLink>
                <span className="ml-2 text-muted">· {row.agentTier}</span>
              </li>
            ))}
          </ul>
        )}
        {groupCandidates.length >= 2 ? (
          <p className="text-sm text-muted">
            Mehrere Coding-/Marketing-/Design-/Sales-Mieten sind aktiv.{" "}
            <ButtonLink href={groupChatHref()} variant="ghost" size="sm">
              Gruppenchat starten
            </ButtonLink>
          </p>
        ) : null}
        <GroupChatStart
          rentals={active.map((row) => ({
            id: row.id,
            agentName: row.agentName ?? row.id,
            agentTier: row.agentTier ?? "",
          }))}
        />
      </PageShell>
    );
  }

  if (sessionIdParam && !rentalId) {
    const groupSession = await getSessionForUser(session.user.id, sessionIdParam);
    if (!groupSession) {
      return (
        <PageShell title="Chat" description="Diese Sitzung fehlt.">
          <EmptyState
            title="Sitzung nicht gefunden"
            description="Öffnen Sie den Chathub und wählen Sie eine aktive Miete."
            actionHref="/chat"
            actionLabel="Andere Miete wählen"
          />
        </PageShell>
      );
    }
    if (groupSession.kind !== "group") {
      return (
        <PageShell title="Chat" description="Öffnen Sie diese Sitzung über die Miete.">
          <ButtonLink
            href={chatRentalHref(groupSession.rentalId)}
            variant="secondary"
          >
            Miet-Chat öffnen
          </ButtonLink>
        </PageShell>
      );
    }
    if (groupSession.status === "closed") {
      return (
        <PageShell
          title="Gruppenchat"
          description="Diese Gruppensitzung endete, weil Mitgliedsmieten endeten oder storniert wurden."
        >
          <ButtonLink href="/chat" variant="secondary">
            Andere Miete wählen
          </ButtonLink>
        </PageShell>
      );
    }
    const members = await listGroupMembers(session.user.id, groupSession.id);
    const activeMembers = members.filter((member) => member.active);
    if (activeMembers.length === 0) {
      return (
        <PageShell
          title="Gruppenchat"
          description="In diesem Raum bleiben keine aktiven bezahlten Mieten."
        >
          <ButtonLink href="/chat" variant="secondary">
            Andere Miete wählen
          </ButtonLink>
        </PageShell>
      );
    }
    const runs = await listSessionRuns(session.user.id, groupSession.id);
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">
            Gruppenchat
          </p>
          <h1 className="font-display text-4xl tracking-tight">
            {activeMembers.map((member) => member.agentName).join(", ")}
          </h1>
          <p className="text-sm text-muted">
            Jeder Turn geht an jede verbleibende bezahlte Miete. Workspace-Memories
            sind für alle Mitglieder sichtbar.
          </p>
        </header>
        <ChatClient
          rentalId={null}
          sessionId={groupSession.id}
          agentName={activeMembers.map((member) => member.agentName).join(", ")}
          failover={failover}
          memoryNetwork={memoryNetwork}
          groupMembers={activeMembers.map((member) => ({
            rentalId: member.rentalId,
            agentName: member.agentName,
            agentSlug: member.agentSlug,
          }))}
          initialRuns={runs.map((run) => ({
            id: run.id,
            status: run.status,
            modelIdUsed: run.modelIdUsed,
            skillVersion: run.skillVersion,
            input: run.input as { message?: unknown } | null,
            output: run.output as { text?: unknown; error?: unknown } | null,
          }))}
        />
      </main>
    );
  }

  if (!rentalId) {
    return (
      <PageShell title="Chat" description="Wählen Sie eine aktive Miete.">
        <ButtonLink href="/chat" variant="ghost">
          Zurück
        </ButtonLink>
      </PageShell>
    );
  }

  const bundle = await getRentalForUser(session.user.id, rentalId);
  if (!bundle) {
    return (
      <PageShell title="Chat" description="Diese Miete fehlt für dieses Konto.">
        <ButtonLink href="/chat" variant="secondary">
          Andere Miete wählen
        </ButtonLink>
      </PageShell>
    );
  }

  if (bundle.rental.status === "pending") {
    return (
      <PageShell
        title={bundle.agent.name}
        description="Zahlung noch nicht bestätigt. Die Erfolgs-URL aktiviert die Miete nicht."
      >
        <PaymentPendingNotice rentalId={rentalId} />
        <ButtonLink href={rentalCheckoutHref(rentalId)} variant="secondary">
          Checkout fortsetzen
        </ButtonLink>
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
            ? "Diese Miete wurde beendet. Chat lehnt beendete Mietfenster ab."
            : "Diese Miete ist nicht aktiv oder abgelaufen."
        }
      >
        {ended ? (
          <p className="text-sm text-muted">
            Beendet
            {bundle.rental.endedAt
              ? ` um ${bundle.rental.endedAt.toISOString()}`
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
        <ButtonLink href="/chat" variant="ghost">
          Andere Miete wählen
        </ButtonLink>
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
        <ButtonLink href="/chat" variant="ghost">
          Zurück
        </ButtonLink>
      </PageShell>
    );
  }

  const runs = await listSessionRuns(session.user.id, opened.data.session.id);
  const durations = bundle.agent.rentalOptions.durations ?? [];
  const allRentals = await listRentals(session.user.id);
  const groupEligible =
    allRentals.filter(
      (row) =>
        rentalIsActive({
          status: row.status,
          startsAt: row.startsAt ? new Date(row.startsAt) : null,
          endsAt: row.endsAt ? new Date(row.endsAt) : null,
        }) && Boolean(agentTypeForCategory(row.agentCategory ?? "")),
    ).length >= 2;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">Chathub</p>
        <h1 className="font-display text-4xl tracking-tight">
          {bundle.agent.name}
        </h1>
        <p className="text-sm text-muted">
          Authentifizierter Stream. Jeder Turn landet als agent_run mit
          model_id_used und provider_used.
        </p>
      </header>
      <ChatClient
        rentalId={rentalId}
        sessionId={opened.data.session.id}
        agentName={bundle.agent.name}
        agentSlug={bundle.agent.slug}
        failover={failover}
        memoryNetwork={memoryNetwork}
        groupEligible={groupEligible}
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
    </main>
  );
}
