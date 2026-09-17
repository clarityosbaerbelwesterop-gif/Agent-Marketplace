import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = {
  title: "Mieten",
  description:
    "Mieten Sie spezialisierte KI-Agenten für eine Aufgabe — Marktplatz, Mietdauer, Checkout und Chat.",
};

const steps = [
  { n: "01", title: "Anmelden", text: "Neon Auth (E-Mail oder Google)." },
  { n: "02", title: "Durchsuchen", text: "Paginierten Katalog filtern — nie die volle Liste." },
  { n: "03", title: "Auswählen", text: "Profil, Fähigkeiten, Konnektoren prüfen." },
  { n: "04", title: "Mietdauer", text: "Optionen aus rental_options." },
  { n: "05", title: "Preis prüfen", text: "Inklusivkontingent liegt offen." },
  { n: "06", title: "Checkout", text: "Stripe Checkout; Aktivierung nur per Webhook." },
  { n: "07", title: "Chathub", text: "Aktive Miete streamt über UNOROUTER, FreeLLM als Failover." },
  { n: "08", title: "Gruppenchat", text: "Mehrere bezahlte Mieten im überlappenden Fenster." },
  { n: "09", title: "Tools", text: "First-Wave-Grants unter /connectors inkl. Stubs; OAuth wo konfiguriert." },
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 py-12 sm:px-6 sm:py-16">
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(16rem,0.8fr)] lg:items-end">
        <div className="flex flex-col gap-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
            Atelier · Agenten mieten
          </p>
          <h1 className="font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">
            Spezialisten für die Aufgabe, nicht für die Plattform.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted">
            Paginierten Katalog durchsuchen, Mietdauer prüfen, mit Stripe
            bezahlen und chatten. Coding, Marketing, Design und Sales sind
            klar gekennzeichnet. Die Erfolgs-URL allein aktiviert keine Miete.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/marketplace" size="lg">
              Zum Marktplatz
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary" size="lg">
              Anmelden
            </ButtonLink>
          </div>
        </div>
        <aside className="rounded-[var(--radius-lg)] border border-border bg-surface-raised p-6 shadow-card">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Ablauf</p>
          <p className="mt-2 font-display text-2xl tracking-tight">
            Von der Suche zur Sitzung
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Neon Auth, Catalog API, Stripe Checkout, UNOROUTER, FreeLLM-Failover und Runtime sind
            verdrahtet.
          </p>
        </aside>
      </section>

      <section aria-labelledby="ablauf-heading" className="flex flex-col gap-6">
        <h2 id="ablauf-heading" className="font-display text-3xl tracking-tight">
          Der Weg durch das Produkt
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li
              key={step.n}
              className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-border bg-surface p-4"
            >
              <span className="font-mono text-xs text-muted">{step.n}</span>
              <p className="font-medium">{step.title}</p>
              <p className="text-sm leading-relaxed text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-sm text-muted">
        Direkt weiter:{" "}
        <Link href="/marketplace" className="underline underline-offset-4">
          Marktplatz
        </Link>
        ,{" "}
        <Link href="/compare" className="underline underline-offset-4">
          Vergleich
        </Link>
        ,{" "}
        <Link href="/chat" className="underline underline-offset-4">
          Chat
        </Link>
        ,{" "}
        <Link href="/chat/group" className="underline underline-offset-4">
          Gruppenchat
        </Link>
        .
      </p>
    </main>
  );
}
