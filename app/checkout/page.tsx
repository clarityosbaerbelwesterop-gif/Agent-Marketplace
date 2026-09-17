import type { Metadata } from "next";
import {
  CheckoutPayPanel,
  CheckoutSummary,
} from "@/components/checkout/checkout-panels";
import { ResumeCheckoutForm } from "@/components/resume-checkout-form";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button-link";
import { PageShell } from "@/components/page-shell";
import { getVerifiedSession } from "@/lib/auth/server";
import { getAgentBySlug, isDatabaseConfigured } from "@/lib/catalog/queries";
import { CONNECTOR_LIST } from "@/lib/connectors";
import { getRentalForUser, rentalIsActive } from "@/lib/runtime/rentals";
import { isUnpaidAccessAllowed } from "@/lib/runtime/unpaid-access";
import { chatRentalHref } from "@/lib/urls";
import { firstSearchParam } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Checkout",
  description:
    "Preis prüfen und mit Stripe Checkout bezahlen. Aktivierung nur per Webhook.",
};

export const dynamic = "force-dynamic";

function FirstWaveConnectorsNote() {
  return (
    <p className="text-sm text-muted">
      First-Wave-Konnektoren (Grant-Stubs nach Zahlung, OAuth nicht standardmäßig
      live): {CONNECTOR_LIST.map((row) => row.displayName).join(", ")}.
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
  const unpaidPreview = isUnpaidAccessAllowed();

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
          description="Melden Sie sich an, um Stripe Checkout fortzusetzen."
        >
          <EmptyState
            title="Anmeldung nötig"
            description="Offene Checkout-Sessions hängen an Ihrer Neon-Auth-Sitzung."
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
            ? "Stripe Checkout wurde abgebrochen. Die Miete bleibt ausstehend, bis ein Webhook die Zahlung bestätigt."
            : active
              ? "Diese Miete ist aktiv. Öffnen Sie den Chat."
              : bundle.rental.status === "pending"
                ? "Zahlung ausstehend. Setzen Sie Stripe Checkout fort. Der Erfolg-Redirect allein aktiviert nichts."
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
        unpaidPreview
          ? "Staging-Vorschau ohne Stripe: nach der Anmeldung direkt in den Chat (1 Stunde)."
          : "Preis liegt offen. Weiter zu Stripe Checkout; die Miete wird erst per Webhook aktiv."
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
              unpaidPreview={unpaidPreview}
            />
            <div className="flex flex-col gap-4">
              <CheckoutPayPanel
                agent={agent}
                durationId={durationId}
                signedIn={Boolean(session?.user)}
                unpaidPreview={unpaidPreview}
              />
            <FirstWaveConnectorsNote />
          </div>
        </div>
      )}
    </PageShell>
  );
}
