"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/checkout", label: "Checkout" },
  { href: "/chat", label: "Chat" },
] as const;

type SiteNavProps = {
  signedIn?: boolean;
};

export function SiteNav({ signedIn = false }: SiteNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main">
      <ul className="flex flex-wrap items-center gap-4 text-sm">
        {links.map(({ href, label }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "transition-colors hover:text-foreground",
                  isActive ? "text-foreground" : "text-muted",
                )}
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
              "transition-colors hover:text-foreground",
              pathname.startsWith("/login") ? "text-foreground" : "text-muted",
            )}
          >
            {signedIn ? "Account" : "Login"}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
