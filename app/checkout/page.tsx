import type { Metadata } from "next";
import {
  CheckoutPayPanel,
  CheckoutSummary,
} from "@/components/checkout/checkout-panels";
import { ResumeCheckoutForm } from "@/components/resume-checkout-form";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button-link";
import { LegalLinks } from "@/components/legal-links";
import { PageShell } from "@/components/page-shell";
import { getVerifiedSession } from "@/lib/auth/server";
import { getAgentBySlug, isDatabaseConfigured } from "@/lib/catalog/queries";
import { getRentalForUser, rentalIsActive } from "@/lib/runtime/rentals";
import { isUnpaidAccessAllowed } from "@/lib/runtime/unpaid-access";
import { chatRentalHref } from "@/lib/urls";
import { firstSearchParam } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Checkout",
  description:
    "Preis prüfen und über den gehosteten Checkout bezahlen. Aktivierung erst nach Zahlungsbestätigung.",
};

export const dynamic = "force-dynamic";

function FirstWaveConnectorsNote() {
  return (
    <p className="text-sm text-muted">
      First-Wave-Konnektoren werden nach der Zahlung als Freigabe-Stubs angelegt.
      OAuth ist nicht standardmäßig live.
    </p>
  );
}

export default async function CheckoutPage({
  searchParams,
}: PageProps<"/checkout">) {
  const params = await searchParams;
  const rentalId = firstSearchParam(params.rentalId);
  const slug = firstSearchParam(params.agent);
  const durationId = firstSearchParam(params.duration);
  const canceled =
    params.canceled === "1" || params.canceled === "true";
  const session = await getVerifiedSession();
  const unpaidAccess = isUnpaidAccessAllowed();

  if (!isDatabaseConfigured()) {
    return (
      <PageShell
        title="Checkout"
        description="Ohne Katalogdatenbank gibt es keine Mietpreise."
      />
    );
  }

  if (rentalId) {
    if (!session?.user) {
      return (
        <PageShell
          title="Checkout"
          description="Melden Sie sich an, um die Zahlung fortzusetzen."
        >
          <EmptyState
            title="Anmeldung nötig"
            description="Offene Checkout-Sessions hängen an Ihrer angemeldeten Sitzung."
            actionHref="/login"
            actionLabel="Anmelden"
          />
        </PageShell>
      );
    }

    const bundle = await getRentalForUser(session.user.id, rentalId);
    if (!bundle) {
      return (
        <PageShell
          title="Checkout"
          description="Diese Miete wurde für dieses Konto nicht gefunden."
        />
      );
    }

    const active = rentalIsActive(bundle.rental);

    return (
      <PageShell
        width="wide"
        eyebrow="Checkout"
        title="Zahlung"
        description={
          canceled
            ? "Der Checkout wurde abgebrochen. Die Miete bleibt ausstehend, bis die Zahlung bestätigt ist."
            : active
              ? "Diese Miete ist aktiv. Öffnen Sie den Chat."
              : bundle.rental.status === "pending"
                ? unpaidAccess
                  ? "Zahlung ausstehend. Im Testmodus starten Sie eine neue Miete ohne Zahlung."
                  : "Zahlung ausstehend. Setzen Sie den Checkout fort. Der Erfolg-Redirect allein aktiviert nichts."
                : "Diese Miete wartet nicht auf Zahlung."
        }
      >
        <p className="text-sm">
          {bundle.agent.name}
          <span className="text-muted"> · {bundle.rental.status}</span>
        </p>
        <FirstWaveConnectorsNote />
        {active ? (
          <ButtonLink href={chatRentalHref(bundle.rental.id)}>
            Zum Chat
          </ButtonLink>
        ) : bundle.rental.status === "pending" ? (
          <ResumeCheckoutForm rentalId={bundle.rental.id} />
        ) : null}
        <LegalLinks prefix="Zahlung unterliegt" />
      </PageShell>
    );
  }

  const agent = slug ? await getAgentBySlug(slug) : undefined;

  return (
    <PageShell
      width="wide"
      eyebrow="Checkout"
      title="Miete prüfen"
      description={
        unpaidAccess
          ? "Preis liegt offen. Testmodus aktiviert die Miete sofort — ohne Zahlung und ohne Kartenformular."
          : "Preis liegt offen. Weiter zum gehosteten Checkout; die Miete wird erst nach Zahlungsbestätigung aktiv."
      }
    >
      {!agent ? (
        <div className="flex flex-col gap-4">
          <EmptyState
            title="Kein Agent ausgewählt"
            description="Wählen Sie ein Profil im paginierten Katalog und eine Mietdauer."
            actionHref="/marketplace"
            actionLabel="Zum Marktplatz"
          />
          <FirstWaveConnectorsNote />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <CheckoutSummary
            agent={agent}
            durationId={durationId}
            unpaidAccess={unpaidAccess}
          />
          <div className="flex flex-col gap-4">
            <CheckoutPayPanel
              agent={agent}
              durationId={durationId}
              signedIn={Boolean(session?.user)}
              unpaidAccess={unpaidAccess}
            />
            <FirstWaveConnectorsNote />
          </div>
        </div>
      )}
      <LegalLinks prefix="Zahlung unterliegt" />
    </PageShell>
  );
}
