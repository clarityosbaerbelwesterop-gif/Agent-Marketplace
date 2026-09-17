import type {
  FixtureAgent,
  FixtureDuration,
  FixtureMoney,
  FixtureTier,
} from "@/lib/fixtures/types";

function eur(amountEuros: number): FixtureMoney {
  return { amountCents: Math.round(amountEuros * 100), currency: "EUR" };
}

/**
 * UI-only list prices by tier. Not a billing engine.
 * Stripe and Neon pricing tables are out of scope for this layer.
 */
const TIER_DAY_RATE: Record<FixtureTier, number> = {
  standard: 24,
  advanced: 42,
  expert: 78,
  elite: 145,
  frontier: 260,
};

function pricingFor(tier: FixtureTier): Record<FixtureDuration, FixtureMoney> {
  const day = TIER_DAY_RATE[tier];
  return {
    hour: eur(Math.max(9, Math.round(day * 0.28))),
    day: eur(day),
    week: eur(Math.round(day * 5.5)),
    month: eur(Math.round(day * 18)),
  };
}

function usageFor(tier: FixtureTier): Record<FixtureDuration, string> {
  const dayRequests: Record<FixtureTier, number> = {
    standard: 40,
    advanced: 80,
    expert: 140,
    elite: 220,
    frontier: 360,
  };
  const n = dayRequests[tier];
  return {
    hour: `${Math.round(n / 6)} Anfragen inklusive`,
    day: `${n} Anfragen inklusive`,
    week: `${n * 6} Anfragen inklusive`,
    month: `${n * 22} Anfragen inklusive`,
  };
}

/**
 * UI FIXTURES — not a production catalog, not a 10k seed.
 *
 * ~20 realistic profiles so Marketplace, Detail, Compare, and Checkout
 * can be designed against typed data. Replace with Neon-backed queries
 * (`lib/integrations/catalog.ts`) without changing the `Agent` type.
 */
export const UI_AGENT_FIXTURES: readonly FixtureAgent[] = [
  {
    slug: "klausur-vertrag",
    name: "Klausur",
    tagline: "Vertragsprüfung für deutschsprachige B2B-Texte.",
    description:
      "Liest Kauf-, AGB- und NDA-Entwürfe, markiert Abweichungen zur internen Klauselbibliothek und formuliert Rückfragen an die Gegenseite. Keine Rechtsberatung und keine Unterschriftsfreigabe.",
    category: "legal",
    tier: "expert",
    languages: ["de"],
    identity: { initials: "KL", palette: "ink" },
    specializations: [
      "B2B-Kaufverträge",
      "NDA-Abgleich",
      "AGB-Abweichungen",
    ],
    skills: [
      {
        name: "Klauselabgleich",
        summary: "Stellt Ist-Text der Gegenseite einer internen Soll-Liste gegenüber.",
      },
      {
        name: "Risikokommentar",
        summary: "Schreibt knappe Hinweise zu Haftung, Laufzeit und Kündigung.",
      },
    ],
    connectors: ["files", "email"],
    permissions: [
      "Hochgeladene Vertragsdateien lesen",
      "E-Mail-Entwürfe erzeugen, nicht senden",
    ],
    availability: "available",
    untested: false,
    pricing: pricingFor("expert"),
    includedUsage: usageFor("expert"),
  },
  {
    slug: "lex-dsgvo",
    name: "Lex",
    tagline: "Datenschutz-Checklisten für Verarbeitungsbeschreibungen.",
    description:
      "Hilft beim Strukturieren von Verarbeitungsverzeichnissen, AV-Verträgen und Betroffenenanfragen. Kennzeichnet Lücken, trifft aber keine Freigabeentscheidung.",
    category: "legal",
    tier: "elite",
    languages: ["de"],
    identity: { initials: "LX", palette: "slate" },
    specializations: ["AV-Verträge", "TOM-Beschreibungen", "Betroffenenanfragen"],
    skills: [
      {
        name: "Verzeichnisgerüst",
        summary: "Baut Abschnitte nach Art. 30-Struktur aus vorhandenen Notizen.",
      },
      {
        name: "Lückenkarte",
        summary: "Listet fehlende Zweck-, Empfänger- und Löschangaben.",
      },
    ],
    connectors: ["files", "email", "database-readonly"],
    permissions: [
      "Interne Richtlinien im Dateikontext lesen",
      "Keine Änderungen an Produktivdaten",
    ],
    availability: "limited",
    untested: false,
    pricing: pricingFor("elite"),
    includedUsage: usageFor("elite"),
  },
  {
    slug: "atlas-recherche",
    name: "Atlas",
    tagline: "Quellenbasierte Kurzrecherchen mit Zitatpflicht.",
    description:
      "Sammelt öffentlich zugängliche Angaben zu einem Thema, trennt Beleg und Interpretation und liefert eine kommentierte Quellenliste. Erfindet keine Zitate.",
    category: "research",
    tier: "advanced",
    languages: ["de-en"],
    identity: { initials: "AT", palette: "forest" },
    specializations: ["Marktüberblick", "Wettbewerberprofile", "Belegliste"],
    skills: [
      {
        name: "Quellenlage",
        summary: "Ordnet Treffer nach Primärquelle, Datum und Zugänglichkeit.",
      },
      {
        name: "Kurzbriefing",
        summary: "Fasst den Stand in einem einseitigen Memo zusammen.",
      },
    ],
    connectors: ["web-search", "files"],
    permissions: ["Öffentliche Websuche", "Hochgeladene Briefings lesen"],
    availability: "available",
    untested: false,
    pricing: pricingFor("advanced"),
    includedUsage: usageFor("advanced"),
  },
  {
    slug: "folio-quellen",
    name: "Folio",
    tagline: "Literatur- und Studienlage für interne Memos.",
    description:
      "Arbeitet mit hochgeladenen PDFs und öffentlichen Abstracts. Markiert Methodik, Stichprobe und Grenzen — ohne Wirkversprechen.",
    category: "research",
    tier: "expert",
    languages: ["de"],
    identity: { initials: "FO", palette: "ochre" },
    specializations: ["Studienexzerpte", "Methodenhinweise", "Widerspruchskarte"],
    skills: [
      {
        name: "Exzerpt",
        summary: "Zieht Fragestellung, Design und Ergebnis in feste Felder.",
      },
      {
        name: "Konfliktliste",
        summary: "Stellt abweichende Befunde nebeneinander.",
      },
    ],
    connectors: ["files", "web-search"],
    permissions: ["PDF-Korpus der Miete lesen", "Websuche für Abstracts"],
    availability: "available",
    untested: false,
    pricing: pricingFor("expert"),
    includedUsage: usageFor("expert"),
  },
  {
    slug: "bruecke-code",
    name: "Brücke",
    tagline: "Code-Review mit Fokus auf Diffs und Risiken.",
    description:
      "Liest Pull-Request-Diffs, benennt Regressionsrisiken und schlägt Testlücken vor. Führt keine Merges aus und schreibt keine Secrets in den Chat.",
    category: "engineering",
    tier: "elite",
    languages: ["de-en"],
    identity: { initials: "BR", palette: "sea" },
    specializations: ["Diff-Review", "Testlücken", "API-Verträge"],
    skills: [
      {
        name: "Diff-Kommentar",
        summary: "Kommentiert geänderte Dateien nach Risiko, nicht nach Stil.",
      },
      {
        name: "Checklisten",
        summary: "Ergänzt Rollback- und Beobachtungspunkte vor dem Merge.",
      },
    ],
    connectors: ["github", "files"],
    permissions: ["Repository lesen", "Keine Schreibrechte ohne Freigabe"],
    availability: "available",
    untested: false,
    pricing: pricingFor("elite"),
    includedUsage: usageFor("elite"),
  },
  {
    slug: "nora-review",
    name: "Nora",
    tagline: "Pull-Request-Triage for TypeScript services.",
    description:
      "Groups review comments by severity, flags missing tests around error paths, and drafts reviewer notes. Does not merge or push.",
    category: "engineering",
    tier: "advanced",
    languages: ["en"],
    identity: { initials: "NO", palette: "slate" },
    specializations: ["TypeScript services", "Error paths", "Review notes"],
    skills: [
      {
        name: "Severity grouping",
        summary: "Separates blockers from nits so humans can scan faster.",
      },
      {
        name: "Test hints",
        summary: "Points at untested branches without generating a suite.",
      },
    ],
    connectors: ["github", "files"],
    permissions: ["Read repositories", "No write access"],
    availability: "available",
    untested: false,
    pricing: pricingFor("advanced"),
    includedUsage: usageFor("advanced"),
  },
  {
    slug: "helfer-support",
    name: "Helfer",
    tagline: "Antwortentwürfe für den deutschsprachigen First-Level-Support.",
    description:
      "Schreibt höfliche Antwortskizzen aus Makros und Tickettext. Eskaliert statt zu spekulieren, wenn die Wissensbasis fehlt.",
    category: "support",
    tier: "standard",
    languages: ["de"],
    identity: { initials: "HE", palette: "clay" },
    specializations: ["Makro-Antworten", "Eskalationshinweise", "Tonfall DE"],
    skills: [
      {
        name: "Antwortskizze",
        summary: "Baut eine klare, kurze Kundenmail aus Ticket und Makro.",
      },
      {
        name: "Lückenstopp",
        summary: "Hält inne, wenn die Wissensbasis den Fall nicht deckt.",
      },
    ],
    connectors: ["email", "crm", "files"],
    permissions: ["Tickettext lesen", "Keine stillen Kundenmails"],
    availability: "available",
    untested: false,
    pricing: pricingFor("standard"),
    includedUsage: usageFor("standard"),
  },
  {
    slug: "lumen-tickets",
    name: "Lumen",
    tagline: "Ticket-Bündelung und Antwortqualität in Warteschlangen.",
    description:
      "Gruppiert ähnliche Anfragen, schlägt eine Leitantwort vor und listet offene Rückfragen. Keine automatische Statusänderung im Helpdesk.",
    category: "support",
    tier: "advanced",
    languages: ["de"],
    identity: { initials: "LU", palette: "ochre" },
    specializations: ["Duplikaterkennung", "Leitantworten", "Rückfragenliste"],
    skills: [
      {
        name: "Cluster",
        summary: "Fasst Tickets mit gleichem Anliegen zusammen.",
      },
      {
        name: "Qualitätspass",
        summary: "Prüft Entwürfe auf fehlende nächste Schritte.",
      },
    ],
    connectors: ["crm", "email", "slack"],
    permissions: ["Warteschlange lesen", "Keine Statuswechsel"],
    availability: "limited",
    untested: false,
    pricing: pricingFor("advanced"),
    includedUsage: usageFor("advanced"),
  },
  {
    slug: "ziffer-buchhaltung",
    name: "Ziffer",
    tagline: "Belegklassifikation und Buchungshinweise.",
    description:
      "Ordnet Rechnungs-PDFs Kontenrahmen-Vorschlägen zu und markiert fehlende Steuer- oder Kreditorenfelder. Bucht nicht selbst.",
    category: "finance",
    tier: "expert",
    languages: ["de"],
    identity: { initials: "ZI", palette: "forest" },
    specializations: ["Eingangsrechnungen", "Steuerfelder", "Kontenvorschlag"],
    skills: [
      {
        name: "Beleglesen",
        summary: "Extrahiert Betrag, Datum, Kreditor und Steuerhinweis.",
      },
      {
        name: "Kontenvorschlag",
        summary: "Schlägt ein Konto vor und begründet die Zuordnung.",
      },
    ],
    connectors: ["files", "email", "database-readonly"],
    permissions: ["Belege lesen", "Keine Buchungssätze schreiben"],
    availability: "available",
    untested: false,
    pricing: pricingFor("expert"),
    includedUsage: usageFor("expert"),
  },
  {
    slug: "saldo-forecast",
    name: "Saldo",
    tagline: "Liquiditätsmemo aus vorhandenen Ist-Zahlen.",
    description:
      "Baut Szenariotabellen aus hochgeladenen CSV/Excel-Ständen. Keine Marktprognose und keine erfundenen Wachstumsraten.",
    category: "finance",
    tier: "frontier",
    languages: ["de-en"],
    identity: { initials: "SA", palette: "ink" },
    specializations: ["Liquiditätsmemo", "Szenariotabellen", "Annahmenliste"],
    skills: [
      {
        name: "Ist-Stand",
        summary: "Liest nur gelieferte Zahlen, füllt keine Lücken still.",
      },
      {
        name: "Annahmenprotokoll",
        summary: "Schreibt jede Szenarioannahme als eigenen Satz.",
      },
    ],
    connectors: ["files", "database-readonly"],
    permissions: ["Finanzexporte lesen", "Keine Schreibrechte ins ERP"],
    availability: "waitlist",
    untested: true,
    pricing: pricingFor("frontier"),
    includedUsage: usageFor("frontier"),
  },
  {
    slug: "persona-hr",
    name: "Persona",
    tagline: "Stellenprofile und Interviewleitfäden.",
    description:
      "Formuliert Anzeigentexte und strukturierte Fragen aus einem Briefing. Trifft keine Auswahlentscheidung über Bewerbende.",
    category: "operations",
    tier: "advanced",
    languages: ["de"],
    identity: { initials: "PE", palette: "clay" },
    specializations: ["Stellenanzeigen", "Leitfäden", "Kompetenzraster"],
    skills: [
      {
        name: "Anzeigentext",
        summary: "Schreibt sachliche DE-Anzeigen ohne Superlative.",
      },
      {
        name: "Frageraster",
        summary: "Ordnet Fragen nach Kompetenz, nicht nach Bauchgefühl.",
      },
    ],
    connectors: ["files", "email"],
    permissions: ["Briefings lesen", "Keine Bewerberdatenbanken"],
    availability: "available",
    untested: false,
    pricing: pricingFor("advanced"),
    includedUsage: usageFor("advanced"),
  },
  {
    slug: "ton-copy",
    name: "Ton",
    tagline: "Sachliche Produkttexte auf Deutsch.",
    description:
      "Schreibt UI-Mikrocopy, Hilfeartikel und Release-Notizen im vorgegebenen Ton. Erfindet keine Nutzerzahlen oder Erfolgsquoten.",
    category: "marketing",
    tier: "standard",
    languages: ["de"],
    identity: { initials: "TO", palette: "ochre" },
    specializations: ["UI-Texte", "Hilfeartikel", "Release-Notizen"],
    skills: [
      {
        name: "Mikrocopy",
        summary: "Kürzt Labels und Fehlermeldungen auf klare Verben.",
      },
      {
        name: "Faktentreue",
        summary: "Übernimmt nur Angaben, die im Briefing stehen.",
      },
    ],
    connectors: ["files"],
    permissions: ["Briefing und Styleguide lesen"],
    availability: "available",
    untested: false,
    pricing: pricingFor("standard"),
    includedUsage: usageFor("standard"),
  },
  {
    slug: "kampagne-brief",
    name: "Kampagne",
    tagline: "Kampagnenbriefings und Variantenplanung.",
    description:
      "Zerlegt ein Ziel in Kanäle, Botschaften und nötige Assets. Plant keine Budgets und behauptet keine Reichweiten.",
    category: "marketing",
    tier: "expert",
    languages: ["de"],
    identity: { initials: "KA", palette: "sea" },
    specializations: ["Briefings", "Botschaftsmatrix", "Assetliste"],
    skills: [
      {
        name: "Briefinggerüst",
        summary: "Ziel, Angebot, Einwand, nächster Schritt — in dieser Reihenfolge.",
      },
      {
        name: "Varianten",
        summary: "Liefert Textvarianten ohne Performance-Versprechen.",
      },
    ],
    connectors: ["files", "web-search", "crm"],
    permissions: ["Kampagnendokumente lesen", "Öffentliche Referenzen suchen"],
    availability: "available",
    untested: false,
    pricing: pricingFor("expert"),
    includedUsage: usageFor("expert"),
  },
  {
    slug: "takt-ops",
    name: "Takt",
    tagline: "Betriebs-Checklisten und Schichtübergaben.",
    description:
      "Formuliert Übergabeprotokolle, Runbooks und Eskalationspfade aus vorhandenen Notizen. Ändert keine Ticketsystem-Zustände.",
    category: "operations",
    tier: "advanced",
    languages: ["de"],
    identity: { initials: "TA", palette: "forest" },
    specializations: ["Runbooks", "Übergaben", "Eskalationen"],
    skills: [
      {
        name: "Protokoll",
        summary: "Packt offene Punkte, Blocker und nächste Owner in eine Liste.",
      },
      {
        name: "Runbook-Lücken",
        summary: "Markiert Schritte ohne klaren Abbruch.",
      },
    ],
    connectors: ["slack", "files", "calendar"],
    permissions: ["Interne Notizen lesen", "Kalender nur lesen"],
    availability: "available",
    untested: false,
    pricing: pricingFor("advanced"),
    includedUsage: usageFor("advanced"),
  },
  {
    slug: "sieve-compliance",
    name: "Sieve",
    tagline: "Richtlinienabgleich für interne Prozesse.",
    description:
      "Vergleicht Prozessbeschreibungen mit hochgeladenen Policies. Listet Abweichungen, bewertet sie aber nicht als Audit-Ergebnis.",
    category: "compliance",
    tier: "elite",
    languages: ["de"],
    identity: { initials: "SI", palette: "ink" },
    specializations: ["Policy-Diff", "Kontrolllücken", "Maßnahmenentwurf"],
    skills: [
      {
        name: "Soll-Ist",
        summary: "Stellt Policy-Sätze den Prozessschritten gegenüber.",
      },
      {
        name: "Maßnahmenentwurf",
        summary: "Schlägt Klärungsfragen vor, keine Zertifikate.",
      },
    ],
    connectors: ["files", "database-readonly"],
    permissions: ["Policies und Prozessdokumente lesen"],
    availability: "limited",
    untested: false,
    pricing: pricingFor("elite"),
    includedUsage: usageFor("elite"),
  },
  {
    slug: "prisma-daten",
    name: "Prisma",
    tagline: "Tabellenfragen mit nachvollziehbarer Herleitung.",
    description:
      "Beantwortet Fragen an hochgeladene Tabellen, zeigt Filter und Aggregation und bricht ab, wenn die Datei die Frage nicht trägt.",
    category: "research",
    tier: "expert",
    languages: ["de-en"],
    identity: { initials: "PR", palette: "slate" },
    specializations: ["CSV/Excel", "Aggregation", "Datenlücken"],
    skills: [
      {
        name: "Herleitung",
        summary: "Schreibt die angewendeten Filter als Sätze, nicht nur als Zahl.",
      },
      {
        name: "Lückenstopp",
        summary: "Sagt, wenn Spalten oder Zeiträume fehlen.",
      },
    ],
    connectors: ["files", "database-readonly"],
    permissions: ["Tabellen der Miete lesen", "Keine stillen Writes"],
    availability: "available",
    untested: false,
    pricing: pricingFor("expert"),
    includedUsage: usageFor("expert"),
  },
  {
    slug: "anker-vertrieb",
    name: "Anker",
    tagline: "Gesprächsleitfäden und Einwandskizzen.",
    description:
      "Bereitet Discovery-Fragen und Einwandantworten aus einem Produktbriefing vor. Keine erfundenen Referenzen und keine Abschlussquoten.",
    category: "marketing",
    tier: "standard",
    languages: ["de"],
    identity: { initials: "AN", palette: "clay" },
    specializations: ["Discovery", "Einwände", "Follow-up-Entwürfe"],
    skills: [
      {
        name: "Leitfaden",
        summary: "Baut ein Gespräch in Phasen mit offenen Fragen.",
      },
      {
        name: "Einwandskizze",
        summary: "Antwortet nur mit im Briefing belegten Fakten.",
      },
    ],
    connectors: ["crm", "email", "files"],
    permissions: ["Briefings lesen", "CRM nur lesen"],
    availability: "available",
    untested: false,
    pricing: pricingFor("standard"),
    includedUsage: usageFor("standard"),
  },
  {
    slug: "kante-security",
    name: "Kante",
    tagline: "Threat-model notes for app changes.",
    description:
      "Reads a change description and lists likely trust-boundary shifts, missing authz checks, and logging gaps. Does not run exploits or scanners.",
    category: "engineering",
    tier: "frontier",
    languages: ["en"],
    identity: { initials: "KN", palette: "ink" },
    specializations: ["Trust boundaries", "Authz gaps", "Logging"],
    skills: [
      {
        name: "Boundary map",
        summary: "Names where new data or trust crosses a component edge.",
      },
      {
        name: "Question list",
        summary: "Hands reviewers concrete questions instead of a score.",
      },
    ],
    connectors: ["github", "files"],
    permissions: ["Read diffs and design notes", "No scanner execution"],
    availability: "waitlist",
    untested: true,
    pricing: pricingFor("frontier"),
    includedUsage: usageFor("frontier"),
  },
  {
    slug: "archiv-docs",
    name: "Archiv",
    tagline: "Dokumentationsgerüst aus vorhandenen Notizen.",
    description:
      "Ordnet Wiki-Rohtext in Zweck, Ablauf, Ausnahmen und Owner. Erfindet keine Architektur, die nicht im Material steht.",
    category: "operations",
    tier: "standard",
    languages: ["de"],
    identity: { initials: "AR", palette: "slate" },
    specializations: ["Betriebshandbuch", "Owner-Felder", "Glossar"],
    skills: [
      {
        name: "Gerüst",
        summary: "Zieht Überschriften in ein festes Handbuchschema.",
      },
      {
        name: "Offene Stellen",
        summary: "Markiert Abschnitte ohne Owner oder ohne Abbruchkriterium.",
      },
    ],
    connectors: ["files"],
    permissions: ["Notizexport der Miete lesen"],
    availability: "available",
    untested: false,
    pricing: pricingFor("standard"),
    includedUsage: usageFor("standard"),
  },
  {
    slug: "mesa-discovery",
    name: "Mesa",
    tagline: "Discovery-Memos aus Interviews und Tickets.",
    description:
      "Verdichtet Interviewnotizen zu Problemen, Arbeitarounds und gewünschtem Outcome. Quantifiziert nichts, was nicht im Material steht.",
    category: "research",
    tier: "advanced",
    languages: ["de-en"],
    identity: { initials: "ME", palette: "sea" },
    specializations: ["Interviewmemos", "Problemstatements", "Opportunity-Liste"],
    skills: [
      {
        name: "Verdichtung",
        summary: "Gruppiert Zitate nach Job-to-be-done, nicht nach Persona-Klischee.",
      },
      {
        name: "Offene Fragen",
        summary: "Listet, was die Interviews nicht beantworten.",
      },
    ],
    connectors: ["files", "crm"],
    permissions: ["Interviewnotizen lesen", "Keine stillen CRM-Writes"],
    availability: "available",
    untested: false,
    pricing: pricingFor("advanced"),
    includedUsage: usageFor("advanced"),
  },
] satisfies readonly FixtureAgent[];

export const UI_FIXTURE_DISCLAIMER =
  "UI-Fixtures — 20 Profile zum Gestalten der Oberfläche, kein Produktionskatalog.";

export function getFixtureAgent(slug: string): FixtureAgent | undefined {
  return UI_AGENT_FIXTURES.find((agent) => agent.slug === slug);
}

export function getFixtureAgentsBySlugs(slugs: string[]): FixtureAgent[] {
  const unique = [...new Set(slugs)].slice(0, 3);
  return unique
    .map((slug) => getFixtureAgent(slug))
    .filter((agent): agent is FixtureAgent => Boolean(agent));
}
