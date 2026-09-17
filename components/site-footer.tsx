import Link from "next/link";

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
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex max-w-sm flex-col gap-3">
          <p className="font-display text-xl">Atelier</p>
          <p className="text-sm leading-relaxed text-muted">
            Mieten Sie spezialisierte Agenten für eine klar umrissene Aufgabe.
            Neon Auth, Stripe Checkout, Catalog API und Runtime sind verdrahtet.
            Fixtures sind nur Designproben, nicht der Katalog.
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
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted sm:px-6">
          Neon Auth, Stripe Checkout und die Agenten-Runtime sind verdrahtet. Der
          Marktplatz liest Postgres, nicht UI-Fixtures.
        </p>
      </div>
    </footer>
  );
}
