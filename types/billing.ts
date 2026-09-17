import type { AgentSlug, Money } from "@/types/agent";

export type CheckoutDraft = {
  agentSlug: AgentSlug;
  durationId: string;
  subtotal: Money;
  includedUsage: string;
};

export type PaymentConnectionStatus = "configured" | "not_configured";

/** Marketplace billing path recorded on rental API responses. */
export type RentalBilling = "stripe" | "unpaid_test";
