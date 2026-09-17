import type { Metadata } from "next";
import { GroupChatPicker } from "@/components/chat/group-chat-client";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { getVerifiedSession } from "@/lib/auth/server";
import { agentTypeForCategory } from "@/lib/catalog/agent-types";
import { isDatabaseConfigured } from "@/lib/catalog/queries";
import {
  listRentals,
  rentalIsActive,
} from "@/lib/runtime/rentals";
import { parseRentalIdList } from "@/lib/runtime/group-window";
import { firstSearchParam } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Gruppenchat",
  description:
    "Mehrere aktive Mieten im überlappenden Fenster. Kein unbezahlter Bypass.",
};

export const dynamic = "force-dynamic";

export default async function GroupChatPage({
  searchParams,
}: PageProps<"/chat/group">) {
  const params = await searchParams;
  const requestedIds = parseRentalIdList(firstSearchParam(params.rentalIds));
  const session = await getVerifiedSession();

  if (!session?.user) {
    return (
      <PageShell
        eyebrow="Chat"
        title="Gruppenchat"
        description="Melden Sie sich an, um aktive Mieten in einem Gruppenchat zu bündeln."
      >
        <EmptyState
          title="Anmeldung nötig"
          description="Gruppenchat hängt an einer verifizierten Sitzung."
          actionHref="/login"
          actionLabel="Anmelden"
        />
      </PageShell>
    );
  }

  if (!isDatabaseConfigured()) {
    return (
      <PageShell
        title="Gruppenchat"
        description="Ohne DATABASE_URL gibt es keine Miet-Sitzungen."
      />
    );
  }

  const rentals = await listRentals(session.user.id);
  const active = rentals.filter((row) =>
    rentalIsActive({
      status: row.status,
      startsAt: row.startsAt ? new Date(row.startsAt) : null,
      endsAt: row.endsAt ? new Date(row.endsAt) : null,
    }),
  );
  const candidates = active.filter((row) =>
    Boolean(agentTypeForCategory(row.agentCategory ?? "")),
  );

  return (
    <PageShell
      eyebrow="Chat"
      title="Gruppenchat"
      description="Wählen Sie zwei oder mehr aktive Coding-, Marketing-, Design- oder Sales-Mieten. Die Gruppensitzung entsteht über die Runtime, nicht über unbezahlten Zugang."
      actions={
        <ButtonLink href="/chat" variant="ghost">
          Einzelchat
        </ButtonLink>
      }
    >
      {candidates.length < 2 ? (
        <EmptyState
          title="Zu wenige aktive Mieten"
          description="Gruppenchat braucht mindestens zwei per Zahlungsbestätigung aktivierte Mieten in Coding, Marketing, Design oder Sales. Ausstehende Checkouts zählen nicht."
          actionHref="/marketplace"
          actionLabel="Marktplatz öffnen"
        />
      ) : (
        <GroupChatPicker
          candidates={candidates.map((row) => ({
            rentalId: row.id,
            agentName: row.agentName ?? "Agent",
            agentSlug: row.agentSlug ?? row.id,
            agentType: agentTypeForCategory(row.agentCategory ?? ""),
            endsAt: row.endsAt,
            startsAt: row.startsAt,
          }))}
          initiallySelected={requestedIds}
        />
      )}
    </PageShell>
  );
}
