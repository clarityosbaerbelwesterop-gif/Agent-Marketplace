import type { RentalSession } from "@/types/rental";

/**
 * TODO: Load the caller's active rental from Neon.
 * Until rentals exist, the chat hub shows an honest empty state.
 */
export async function getActiveRental(): Promise<RentalSession | null> {
  return null;
}
