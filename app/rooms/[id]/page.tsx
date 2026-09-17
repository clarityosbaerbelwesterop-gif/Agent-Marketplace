import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button-link";
import { RoomChatClient } from "@/components/rooms/room-chat-client";
import { getVerifiedSession } from "@/lib/auth/server";
import { isDatabaseConfigured } from "@/lib/catalog/queries";
import { getRoomForUser } from "@/lib/runtime/agent-rooms";
import { rentalIsActive } from "@/lib/runtime/rental-status";

export const metadata: Metadata = {
  title: "Raum",
};

export const dynamic = "force-dynamic";

export default async function RoomDetailPage({
  params,
}: PageProps<"/rooms/[id]">) {
  const { id } = await params;
  const session = await getVerifiedSession();
  if (!session?.user) {
    return (
      <PageShell title="Raum" description="Anmeldung nötig.">
        <EmptyState
          title="Anmeldung nötig"
          actionHref="/login"
          actionLabel="Anmelden"
          description="Gruppenräume sind an eine angemeldete Sitzung gebunden."
        />
      </PageShell>
    );
  }
  if (!isDatabaseConfigured()) {
    return <PageShell title="Raum" description="Ohne DATABASE_URL." />;
  }
  const bundle = await getRoomForUser(session.user.id, id);
  if (!bundle) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <ButtonLink href="/rooms" variant="ghost" size="sm">
        Alle Räume
      </ButtonLink>
      <RoomChatClient
        roomId={bundle.room.id}
        title={bundle.room.title}
        initialMembers={bundle.members.map((member) => ({
          rentalId: member.rentalId,
          sessionId: member.sessionId,
          agentName: member.agentName,
          agentSlug: member.agentSlug,
          active: rentalIsActive({
            status: member.rentalStatus,
            startsAt: member.rentalStartsAt,
            endsAt: member.rentalEndsAt,
          }),
        }))}
        initialMessages={bundle.messages.map((row) => ({
          id: row.id,
          authorKind: row.authorKind,
          rentalId: row.rentalId,
          content: row.content,
          status: row.status,
          runStatus: null,
          createdAt: row.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
