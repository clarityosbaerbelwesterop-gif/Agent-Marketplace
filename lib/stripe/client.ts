import Stripe from "stripe";
import { getStripeSecretKey } from "./config";

const globalForStripe = globalThis as unknown as {
  marketplaceStripe?: Stripe;
};

/**
 * Official Stripe SDK client. Lazy so `next build` can import this module
 * without `STRIPE_SECRET_KEY`.
 */
export function getStripe(): Stripe {
  if (!globalForStripe.marketplaceStripe) {
    globalForStripe.marketplaceStripe = new Stripe(getStripeSecretKey(), {
      appInfo: {
        name: "Agent Marketplace",
        url: "https://github.com/clarityosbaerbelwesterop-gif/Agent-Marketplace",
      },
    });
  }
  return globalForStripe.marketplaceStripe;
}

export { Stripe };
