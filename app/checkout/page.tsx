import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { ResumeCheckoutForm } from "@/components/resume-checkout-form";
import { getVerifiedSession } from "@/lib/auth/server";
import { isDatabaseConfigured } from "@/lib/catalog/queries";
import { getRentalForUser, rentalIsActive } from "@/lib/runtime/rentals";

export const metadata: Metadata = {
  title: "Checkout",
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: PageProps<"/checkout">) {
  const params = await searchParams;
  const rentalId =
    typeof params.rentalId === "string" ? params.rentalId : undefined;
  const canceled =
    params.canceled === "1" || params.canceled === "true";
  const session = await getVerifiedSession();

  if (!session?.user) {
    return (
      <PageShell
        title="Checkout"
        description="Sign in to pay for an agent rental with Stripe Checkout."
      >
        <Link className="text-sm underline underline-offset-4" href="/login">
          Sign in
        </Link>
      </PageShell>
    );
  }

  if (!isDatabaseConfigured()) {
    return (
      <PageShell
        title="Checkout"
        description="Catalog database is not configured on this server."
      />
    );
  }

  if (!rentalId) {
    return (
      <PageShell
        title="Checkout"
        description="Choose an agent, then continue to Stripe Checkout. Payment is confirmed by webhook, not by this page."
      >
        <p className="text-sm">
          <Link className="underline underline-offset-4" href="/marketplace">
            Browse the catalog
          </Link>
        </p>
      </PageShell>
    );
  }

  const bundle = await getRentalForUser(session.user.id, rentalId);
  if (!bundle) {
    return (
      <PageShell
        title="Checkout"
        description="That rental was not found for this account."
      />
    );
  }

  const active = rentalIsActive(bundle.rental);

  return (
    <PageShell
      title="Checkout"
      description={
        canceled
          ? "Stripe Checkout was canceled. The rental is still pending until a webhook confirms payment."
          : active
            ? "This rental is active. Open chat to use it."
            : bundle.rental.status === "pending"
              ? "This rental is pending payment. Resume Stripe Checkout to finish paying."
              : "This rental is not awaiting payment."
      }
    >
      <p className="text-sm">
        {bundle.agent.name}
        <span className="text-muted"> · {bundle.rental.status}</span>
      </p>
      {active ? (
        <Link
          className="text-sm underline underline-offset-4"
          href={`/chat?rentalId=${bundle.rental.id}`}
        >
          Open chat
        </Link>
      ) : bundle.rental.status === "pending" ? (
        <ResumeCheckoutForm rentalId={bundle.rental.id} />
      ) : null}
    </PageShell>
  );
}
