import type { AgentSlug, Money } from "@/types/agent";

export type CheckoutDraft = {
  agentSlug: AgentSlug;
  durationId: string;
  subtotal: Money;
  includedUsage: string;
};

export type PaymentConnectionStatus = "configured" | "not_configured";
