import Link from "next/link";
import { LEGAL_LINKS } from "@/lib/legal";

const groups = [
  {
    title: "Produkt",
    links: [
      { href: "/marketplace", label: "Marktplatz" },
      { href: "/compare", label: "Vergleich" },
      { href: "/chat", label: "Chat" },
      { href: "/chat/group", label: "Gruppenchat" },
      { href: "/connectors", label: "Konnektoren" },
      { href: "/connectors/discover", label: "Entdecken" },
    ],
  },
  {
    title: "Konto",
    links: [
      { href: "/login", label: "Anmelden" },
      { href: "/checkout", label: "Checkout" },
    ],
  },
  {
    title: "Rechtliches",
    links: LEGAL_LINKS.map((link) => ({ href: link.href, label: link.label })),
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex max-w-sm flex-col gap-3">
          <p className="font-display text-xl">Atelier</p>
          <p className="text-sm leading-relaxed text-muted">
            Mieten Sie spezialisierte Agenten für eine klar umrissene Aufgabe.
            Katalog, Anmeldung, Zahlung und Chat sind verdrahtet. Fixtures sind
            nur Designproben, nicht der Katalog.
          </p>
        </div>
        {groups.map((group) => (
          <div key={group.title} className="flex flex-col gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
              {group.title}
            </p>
            <ul className="flex flex-col gap-2 text-sm">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-foreground/90 underline-offset-4 hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-4 text-xs text-muted sm:px-6">
          <span>Klarheit OS · Agent Marketplace. Der Katalog kommt aus der Datenbank, nicht aus UI-Fixtures.</span>
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="underline-offset-4 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </p>
      </div>
    </footer>
  );
}
