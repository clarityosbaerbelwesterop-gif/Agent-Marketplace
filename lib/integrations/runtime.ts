import type { ChatThread } from "@/types/chat";
import type { BackgroundJob } from "@/types/rental";

/**
 * TODO: Connect UNOROUTER / agent runtime.
 * No model calls from this UI layer.
 */
export async function getChatThread(_rentalId: string): Promise<ChatThread> {
  return { rentalId: _rentalId, messages: [] };
}

export async function getBackgroundJobs(rentalId: string): Promise<BackgroundJob[]> {
  void rentalId;
  return [];
}
