"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/marketplace", label: "Marktplatz" },
  { href: "/compare", label: "Vergleich" },
  { href: "/chat", label: "Chat" },
  { href: "/connectors", label: "Konnektoren" },
  { href: "/connectors/discover", label: "Entdecken" },
] as const;

type SiteNavProps = {
  signedIn?: boolean;
};

export function SiteNav({ signedIn = false }: SiteNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav aria-label="Hauptnavigation">
      <button
        type="button"
        className="inline-flex h-11 items-center rounded-md px-3 text-sm md:hidden"
        aria-expanded={open}
        aria-controls="site-nav-menu"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Menü schließen" : "Menü"}
      </button>
      <ul
        id="site-nav-menu"
        className={cn(
          "flex flex-col gap-1 text-sm md:flex md:flex-row md:items-center md:gap-1",
          open
            ? "absolute left-0 right-0 top-full border-b border-border bg-background px-4 py-3"
            : "hidden md:flex",
        )}
      >
        {links.map(({ href, label }) => {
          const isActive =
            href === "/connectors"
              ? pathname === "/connectors"
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-2 transition-colors",
                  isActive
                    ? "bg-accent-subtle text-foreground"
                    : "text-muted hover:bg-accent-subtle hover:text-foreground",
                )}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href="/login"
            aria-current={pathname.startsWith("/login") ? "page" : undefined}
            className={cn(
              "block rounded-md px-3 py-2 transition-colors",
              pathname.startsWith("/login")
                ? "bg-accent-subtle text-foreground"
                : "text-muted hover:bg-accent-subtle hover:text-foreground",
            )}
            onClick={() => setOpen(false)}
          >
            {signedIn ? "Konto" : "Anmelden"}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
