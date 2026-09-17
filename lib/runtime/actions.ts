"use server";

import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/auth/server";
import { isDatabaseConfigured } from "@/lib/catalog/queries";
import {
  createRentalCheckout,
  renewRentalCheckout,
  resumeRentalCheckout,
} from "@/lib/runtime/rentals";

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

function redirectAfterRentalCreate(data: {
  billing?: string;
  chatUrl?: string;
  checkoutUrl?: string;
}): CheckoutActionState {
  if (data.billing === "preview" && typeof data.chatUrl === "string") {
    if (data.chatUrl.startsWith("/chat?")) {
      redirect(data.chatUrl);
    }
  }
  if (typeof data.checkoutUrl === "string" && data.checkoutUrl.startsWith("https://")) {
    redirect(data.checkoutUrl);
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
  return redirectAfterRentalCreate(result.data);
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
  return redirectAfterRentalCreate(result.data);
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
  return redirectAfterRentalCreate(result.data);
}
