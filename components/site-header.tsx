import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { getVerifiedSession } from "@/lib/auth/server";

export async function SiteHeader() {
  const session = await getVerifiedSession();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="text-sm font-medium tracking-tight">
          Agent Marketplace
        </Link>
        <SiteNav signedIn={Boolean(session?.user)} />
      </div>
    </header>
  );
}
