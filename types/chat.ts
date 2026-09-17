/**
 * TODO: Wire to the agent runtime / UNOROUTER.
 * Presentational chat types only — no model calls.
 */
export type ChatRole = "user" | "agent" | "system";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type ChatThread = {
  rentalId: string;
  messages: ChatMessage[];
};
