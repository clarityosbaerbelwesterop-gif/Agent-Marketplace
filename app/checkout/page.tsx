import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Checkout",
};

export default function CheckoutPage() {
  return (
    <PageShell
      title="Checkout"
      description="Stripe checkout is not implemented. This route is a shell so billing can be added later without a fake payment form."
    />
  );
}
