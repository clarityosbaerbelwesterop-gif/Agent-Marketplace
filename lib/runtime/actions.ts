"use server";

import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/auth/server";
import { isDatabaseConfigured } from "@/lib/catalog/queries";
import {
  createRentalCheckout,
  renewRentalCheckout,
  resumeRentalCheckout,
} from "@/lib/runtime/rentals";
import { UNPAID_TEST_BILLING } from "@/lib/runtime/unpaid-access";
import { chatRentalHref } from "@/lib/urls";

export type CheckoutActionState = { error: string } | null;

async function requireCheckoutUser(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const userId = await getVerifiedUserId();
  if (!userId) {
    redirect("/login");
  }
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "DATABASE_URL is not configured." };
  }
  return { ok: true, userId };
}

function redirectToCheckout(url: unknown): CheckoutActionState {
  if (typeof url === "string" && url.startsWith("https://")) {
    redirect(url);
  }
  return { error: "Stripe Checkout URL was missing." };
}

export async function startRentalCheckout(
  _prev: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const auth = await requireCheckoutUser();
  if (!auth.ok) {
    return { error: auth.error };
  }
  const slug = String(formData.get("slug") ?? "");
  const durationId = String(formData.get("durationId") ?? "") || undefined;
  const result = await createRentalCheckout({
    userId: auth.userId,
    slug,
    durationId,
  });
  if (!result.ok) {
    return { error: result.error };
  }
  if (result.data.billing === UNPAID_TEST_BILLING) {
    redirect(chatRentalHref(result.data.id));
  }
  return redirectToCheckout(result.data.checkoutUrl);
}

export async function resumePendingCheckout(
  _prev: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const auth = await requireCheckoutUser();
  if (!auth.ok) {
    return { error: auth.error };
  }
  const rentalId = String(formData.get("rentalId") ?? "");
  const result = await resumeRentalCheckout({
    userId: auth.userId,
    rentalId,
  });
  if (!result.ok) {
    return { error: result.error };
  }
  return redirectToCheckout(result.data.checkoutUrl);
}

export async function startRentalRenewal(
  _prev: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const auth = await requireCheckoutUser();
  if (!auth.ok) {
    return { error: auth.error };
  }
  const rentalId = String(formData.get("rentalId") ?? "");
  const durationId = String(formData.get("durationId") ?? "") || undefined;
  const result = await renewRentalCheckout({
    userId: auth.userId,
    rentalId,
    durationId,
  });
  if (!result.ok) {
    return { error: result.error };
  }
  return redirectToCheckout(result.data.checkoutUrl);
}
