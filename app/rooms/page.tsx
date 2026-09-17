import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button-link";
import { getVerifiedSession } from "@/lib/auth/server";
import { isDatabaseConfigured } from "@/lib/catalog/queries";
import { listRentals, rentalIsActive } from "@/lib/runtime/rentals";
import { listRooms } from "@/lib/runtime/agent-rooms";
import { CreateRoomForm } from "@/components/rooms/create-room-form";

export const metadata: Metadata = {
  title: "Räume",
  description: "Mehrere aktive Mieten in einem koordinierten Gruppenchat.",
};

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const session = await getVerifiedSession();
  if (!session?.user) {
    return (
      <PageShell title="Räume" description="Anmeldung nötig.">
        <EmptyState
          title="Anmeldung nötig"
          description="Gruppenräume hängen an aktiven, bezahlten Mieten."
          actionHref="/login"
          actionLabel="Anmelden"
        />
      </PageShell>
    );
  }
  if (!isDatabaseConfigured()) {
    return (
      <PageShell title="Räume" description="Ohne DATABASE_URL keine Räume." />
    );
  }

  const [rooms, rentals] = await Promise.all([
    listRooms(session.user.id),
    listRentals(session.user.id),
  ]);
  const active = rentals.filter((row) =>
    rentalIsActive({
      status: row.status,
      startsAt: row.startsAt ? new Date(row.startsAt) : null,
      endsAt: row.endsAt ? new Date(row.endsAt) : null,
    }),
  );

  return (
    <PageShell
      title="Gruppenräume"
      description="Mindestens zwei aktive Mieten. Jede Nutzernachricht löst genau eine parallele Agentenrunde aus — keine Endlosschleife."
    >
      {active.length < 2 ? (
        <EmptyState
          title="Zu wenige aktive Mieten"
          description="Mieten Sie mindestens zwei Agenten (Stripe Checkout, Webhook muss aktivieren)."
          actionHref="/marketplace"
          actionLabel="Marktplatz"
        />
      ) : (
        <CreateRoomForm
          rentals={active.map((row) => ({
            id: row.id,
            name: row.agentName ?? "Agent",
            tier: row.agentTier ?? "standard",
          }))}
        />
      )}

      {rooms.length === 0 ? null : (
        <ul className="mt-8 flex flex-col gap-2">
          {rooms.map((room) => (
            <li key={room.id}>
              <ButtonLink href={`/rooms/${room.id}`} variant="secondary">
                {room.title}
              </ButtonLink>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
