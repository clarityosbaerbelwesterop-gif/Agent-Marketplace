import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="text-sm font-medium tracking-tight">
          Agent Marketplace
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
