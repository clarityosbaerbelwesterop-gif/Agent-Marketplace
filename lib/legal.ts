/** Public legal routes shown in the German UI (footer, login, checkout). */

export const LEGAL_LINKS = [
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutz" },
] as const;

export const LEGAL_OPERATOR = {
  brand: "Klarheit OS",
  product: "Agent Marketplace",
  studio: "Atelier",
  legalName: "Klarheit OS GmbH",
  street: "[Straße und Hausnummer folgen]",
  city: "[PLZ Ort], Deutschland",
  email: "kontakt@klarheit-os.de",
  privacyEmail: "datenschutz@klarheit-os.de",
} as const;
