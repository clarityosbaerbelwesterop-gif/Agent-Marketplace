"use server";

import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/auth/server";
import { isDatabaseConfigured } from "@/lib/catalog/queries";
import { createUnpaidRental } from "@/lib/runtime/rentals";

export type UnpaidAccessState = { error: string } | null;

export async function startUnpaidAccess(
  _prev: UnpaidAccessState,
  formData: FormData,
): Promise<UnpaidAccessState> {
  const userId = await getVerifiedUserId();
  if (!userId) {
    redirect("/login");
  }
  if (!isDatabaseConfigured()) {
    return { error: "DATABASE_URL is not configured." };
  }
  const slug = String(formData.get("slug") ?? "");
  const durationId = String(formData.get("durationId") ?? "") || undefined;
  const result = await createUnpaidRental({ userId, slug, durationId });
  if (!result.ok) {
    return { error: result.error };
  }
  redirect(`/chat?rentalId=${result.data.id}`);
}
