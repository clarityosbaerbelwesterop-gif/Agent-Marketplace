import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Home",
};

export default function HomePage() {
  return (
    <PageShell
      title="Rent AI agents"
      description="This is a greenfield scaffold. Catalog, Neon Auth, Stripe, and chat are not implemented yet — only routes and shared layout."
    >
      <ul className="flex flex-col gap-3 text-sm">
        <li>
          <Link className="underline underline-offset-4" href="/marketplace">
            Browse marketplace
          </Link>
        </li>
        <li>
          <Link className="underline underline-offset-4" href="/login">
            Auth placeholder
          </Link>
        </li>
      </ul>
    </PageShell>
  );
}
