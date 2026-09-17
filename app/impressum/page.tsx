import type { Metadata } from "next";
import Link from "next/link";
import { LegalArticle, LegalSection } from "@/components/legal/legal-article";
import { PageShell } from "@/components/page-shell";
import { LEGAL_OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Impressum",
  description: `Anbieterkennzeichnung für ${LEGAL_OPERATOR.product} von ${LEGAL_OPERATOR.brand}.`,
};

export default function ImpressumPage() {
  return (
    <PageShell
      width="narrow"
      eyebrow="Rechtliches"
      title="Impressum"
      description="Angaben gemäß § 5 DDG. Platzhalter für die betreibende Gesellschaft — Werte in eckigen Klammern ersetzen wir, sobald das Register feststeht."
    >
      <LegalArticle>
        <LegalSection title="Anbieter">
          <p>
            {LEGAL_OPERATOR.legalName}
            <br />
            {LEGAL_OPERATOR.street}
            <br />
            {LEGAL_OPERATOR.city}
          </p>
          <p>
            {LEGAL_OPERATOR.brand} betreibt {LEGAL_OPERATOR.product} (
            {LEGAL_OPERATOR.studio}): einen Marktplatz, auf dem Sie spezialisierte
            KI-Agenten für ein zeitlich begrenztes Mietfenster nutzen können.
          </p>
        </LegalSection>

        <LegalSection title="Vertretung">
          <p>Geschäftsführung: [Name folgt]</p>
          <p>
            Registergericht: Amtsgericht [folgt]
            <br />
            Handelsregister: HRB [Nummer folgt]
            <br />
            Umsatzsteuer-ID: [USt-IdNr. folgt nach Erteilung]
          </p>
        </LegalSection>

        <LegalSection title="Kontakt">
          <p>
            E-Mail:{" "}
            <a
              className="underline underline-offset-4"
              href={`mailto:${LEGAL_OPERATOR.email}`}
            >
              {LEGAL_OPERATOR.email}
            </a>
          </p>
          <p>
            Datenschutz:{" "}
            <a
              className="underline underline-offset-4"
              href={`mailto:${LEGAL_OPERATOR.privacyEmail}`}
            >
              {LEGAL_OPERATOR.privacyEmail}
            </a>
          </p>
        </LegalSection>

        <LegalSection title="Verantwortlich für journalistisch-redaktionelle Inhalte">
          <p>
            Verantwortlich nach § 18 Abs. 2 MStV: Geschäftsführung der{" "}
            {LEGAL_OPERATOR.legalName}, Anschrift wie oben. Der Katalog beschreibt
            gemietete Agentenprofile; er enthält keine erfundenen Erfolgsquoten
            oder Nutzerzahlen.
          </p>
        </LegalSection>

        <LegalSection title="Streitbeilegung">
          <p>
            Die Europäische Kommission stellt eine Plattform zur
            Online-Streitbeilegung (OS) bereit:{" "}
            <a
              className="underline underline-offset-4"
              href="https://ec.europa.eu/consumers/odr"
              rel="noreferrer"
              target="_blank"
            >
              https://ec.europa.eu/consumers/odr
            </a>
            . Wir sind nicht verpflichtet und nicht bereit, an
            Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
            teilzunehmen.
          </p>
        </LegalSection>

        <LegalSection title="Haftung für Inhalte und Links">
          <p>
            Inhalte dieses Marktplatzes werden mit Sorgfalt gepflegt. Für
            fremde Websites, auf die wir verlinken, sind die jeweiligen Betreiber
            verantwortlich. Chat-Ausgaben gemieteter Agenten sind Arbeitsergebnisse
            im Mietfenster und keine verbindliche Rechts-, Steuer- oder
            Anlageberatung.
          </p>
        </LegalSection>

        <p className="text-muted">
          Weitere Hinweise zur Verarbeitung personenbezogener Daten stehen in der{" "}
          <Link href="/datenschutz" className="underline underline-offset-4">
            Datenschutzerklärung
          </Link>
          .
        </p>
      </LegalArticle>
    </PageShell>
  );
}
