import Link from "next/link";
import { Suspense } from "react";
import { SiteNav } from "@/components/site-nav";
import { getVerifiedSession } from "@/lib/auth/server";

export async function SiteHeader() {
  const session = await getVerifiedSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl tracking-tight">Atelier</span>
          <span className="hidden text-xs uppercase tracking-[0.18em] text-muted sm:inline">
            Agenten
          </span>
        </Link>
        <Suspense fallback={<div className="h-9 w-48" aria-hidden />}>
          <SiteNav signedIn={Boolean(session?.user)} />
        </Suspense>
      </div>
    </header>
  );
}
