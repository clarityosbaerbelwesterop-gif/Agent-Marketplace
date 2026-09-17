import type { Metadata } from "next";
import Link from "next/link";
import { LegalArticle, LegalSection } from "@/components/legal/legal-article";
import { PageShell } from "@/components/page-shell";
import { LEGAL_OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Datenschutz",
  description: `Informationen zur Verarbeitung personenbezogener Daten im ${LEGAL_OPERATOR.product}.`,
};

export default function DatenschutzPage() {
  return (
    <PageShell
      width="narrow"
      eyebrow="Rechtliches"
      title="Datenschutz"
      description="Informationen nach Art. 13 und 14 DSGVO für den Agent Marketplace. Platzhalter, bis die endgültigen Auftragsverarbeiter und die Registeranschrift feststehen."
    >
      <LegalArticle>
        <LegalSection title="1. Verantwortliche Stelle">
          <p>
            Verantwortlicher ist {LEGAL_OPERATOR.legalName},{" "}
            {LEGAL_OPERATOR.street}, {LEGAL_OPERATOR.city}. Kontakt:{" "}
            <a
              className="underline underline-offset-4"
              href={`mailto:${LEGAL_OPERATOR.privacyEmail}`}
            >
              {LEGAL_OPERATOR.privacyEmail}
            </a>
            . Angaben zum Anbieter stehen im{" "}
            <Link href="/impressum" className="underline underline-offset-4">
              Impressum
            </Link>
            .
          </p>
        </LegalSection>

        <LegalSection title="2. Zweck des Dienstes">
          <p>
            {LEGAL_OPERATOR.product} ({LEGAL_OPERATOR.studio}) vermittelt zeitlich
            begrenzte Nutzungsfenster für spezialisierte KI-Agenten: Katalog,
            Konto, Zahlung, Chat, optionale Konnektoren und geteilte Notizen im
            Workspace. Wir verkaufen den Katalog nicht als vollständige Liste an
            den Browser und erfinden keine Benchmarks.
          </p>
        </LegalSection>

        <LegalSection title="3. Welche Daten wir verarbeiten">
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>
              Konto: Name, E-Mail, Sitzung. Anmeldung per E-Mail/Passwort oder
              Google, soweit Sie das wählen.
            </li>
            <li>
              Marktplatz: Filter, Favoriten, Vergleichsauswahl — serverseitig
              paginiert, nicht als Vollkatalog.
            </li>
            <li>
              Miete: gewähltes Profil, Dauer, Status, Nutzungskontingent,
              Beginn und Ende des Fensters.
            </li>
            <li>
              Zahlung: Bestelldaten und Zahlungsstatus über einen gehosteten
              Zahlungsdienst. Kartennummern liegen nicht auf unseren Seiten.
            </li>
            <li>
              Chat und Läufe: Nachrichten, Werkzeugschritte, Modellalias und
              verbrauchte Token im Mietfenster.
            </li>
            <li>
              Notizen (Memories): von Ihnen oder dem Agenten gespeicherte
              Kurztexte, privat oder workspace-sichtbar.
            </li>
            <li>
              Konnektoren: von Ihnen erteilte Freigaben und hinterlegte
              Zugangsdaten für Dienste, die Sie selbst anbinden. Zugangsdaten
              werden in der Oberfläche nicht zurückgegeben.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="4. Rechtsgrundlagen">
          <p>
            Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO) für Konto, Miete,
            Zahlung und Chat. Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO)
            an Betrieb, Missbrauchsabwehr und Absicherung der Sitzung.
            Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), soweit Sie optionale
            Konnektoren, Google-Anmeldung oder workspace-sichtbare Notizen
            aktiv wählen. Rechtliche Pflichten (Art. 6 Abs. 1 lit. c DSGVO) für
            steuerliche Aufbewahrung von Rechnungsdaten.
          </p>
        </LegalSection>

        <LegalSection title="5. Empfänger und Auftragsverarbeitung">
          <p>
            Wir setzen technische Dienstleister nur ein, soweit sie für den
            Betrieb nötig sind. Produktmarketing-Namen der Infrastruktur stehen
            hier nicht; die Kategorien sind:
          </p>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>Hosting der Anwendung</li>
            <li>Datenbank und Authentifizierung</li>
            <li>gehosteter Zahlungsdienst (Checkout außerhalb unserer Seiten)</li>
            <li>Modell-Router für Chat-Antworten, inkl. Failover-Pfad</li>
            <li>
              optionale Dienste, die Sie selbst als Konnektor verbinden
              (z. B. GitHub oder Slack)
            </li>
          </ul>
          <p>
            Eine Miete wird erst aktiv, wenn der Zahlungsdienst die Zahlung
            bestätigt — nicht durch die Erfolgs-URL im Browser. Ohne gesetzte
            Zahlungs- oder Modell-Schlüssel bleibt der jeweilige Schritt
            unvollständig; es gibt keinen unbezahlten Produktiv-Bypass.
          </p>
        </LegalSection>

        <LegalSection title="6. Speicherdauer">
          <p>
            Kontodaten bleiben, solange das Konto besteht. Miet-, Zahlungs- und
            Chatprotokolle speichern wir für die Vertragslaufzeit und die
            gesetzlichen Aufbewahrungsfristen. Nach Ende einer Miete bleibt der
            Chat-Verlauf als Nachweis der erbrachten Nutzung, ist aber nicht mehr
            schreibbar. Widerrufene Konnektor-Freigaben setzen wir auf
            widerrufen; hinterlegte Geheimnisse werden nicht in der UI
            ausgegeben.
          </p>
        </LegalSection>

        <LegalSection title="7. Cookies und Sitzung">
          <p>
            Für die Anmeldung setzen wir ein signiertes Sitzungscookie. Es ist
            für den Login erforderlich (kein Tracking-Cookie). Ohne Sitzung
            bleiben Katalogseiten öffentlich; Chat, Mieten und Konnektoren
            brauchen eine serverseitig geprüfte Anmeldung.
          </p>
        </LegalSection>

        <LegalSection title="8. Drittlandtransfer">
          <p>
            Modell-Router, Hosting oder Zahlung können Verarbeitung in Drittländern
            (insbesondere USA) einschließen. Soweit das geschieht, stützen wir uns
            auf Angemessenheitsbeschlüsse oder Standardvertragsklauseln der
            Europäischen Kommission. Die konkrete Liste der Auftragsverarbeiter
            ergänzen wir, sobald der Produktivbetrieb feststeht.
          </p>
        </LegalSection>

        <LegalSection title="9. Ihre Rechte">
          <p>
            Sie haben das Recht auf Auskunft, Berichtigung, Löschung,
            Einschränkung, Datenübertragbarkeit und Widerspruch (Art. 15–21
            DSGVO) sowie das Recht, eine Einwilligung zu widerrufen. Außerdem
            können Sie sich bei einer Aufsichtsbehörde beschweren, insbesondere
            am Ort Ihres gewöhnlichen Aufenthalts.
          </p>
        </LegalSection>

        <LegalSection title="10. Keine verpflichtende Profilbildung">
          <p>
            Wir erstellen keine Marketing-Scores und keine erfundenen
            Erfolgsstatistiken über Nutzer. Chat-Ausgaben entstehen im gewählten
            Modellalias der Mietstufe. Automatisierte Entscheidungen mit
            Rechtswirkung im Sinne von Art. 22 DSGVO treffen wir nicht.
          </p>
        </LegalSection>

        <p className="text-muted">
          Stand: September 2026. Platzhaltertext für {LEGAL_OPERATOR.brand} /{" "}
          {LEGAL_OPERATOR.product}.
        </p>
      </LegalArticle>
    </PageShell>
  );
}
