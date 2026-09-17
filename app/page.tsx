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
      description="Browse a paginated catalog of rentable agents. Sign in with Neon Auth. Checkout and live model routing are not in this slice."
    >
      <ul className="flex flex-col gap-3 text-sm">
        <li>
          <Link className="underline underline-offset-4" href="/marketplace">
            Browse marketplace
          </Link>
        </li>
        <li>
          <Link className="underline underline-offset-4" href="/login">
            Sign in
          </Link>
        </li>
      </ul>
    </PageShell>
  );
}
