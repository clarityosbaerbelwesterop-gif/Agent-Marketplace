/**
 * Stripe env helpers. Deploy/secrets own the live keys; this module only
 * reads `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the public key.
 * Missing secrets must fail closed — never fall back to unpaid access.
 */

export const STRIPE_NOT_CONFIGURED =
  "STRIPE_SECRET_KEY is not set. Checkout cannot start until Stripe secrets are configured.";

export const STRIPE_WEBHOOK_NOT_CONFIGURED =
  "STRIPE_WEBHOOK_SECRET is not set. Refusing to accept unsigned Stripe events.";

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function isStripeWebhookConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_WEBHOOK_SECRET?.trim(),
  );
}

export function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error(STRIPE_NOT_CONFIGURED);
  }
  return key;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error(STRIPE_WEBHOOK_NOT_CONFIGURED);
  }
  return secret;
}

export function getStripePublishableKey(): string | null {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || null;
}

export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/+$/, "")}`;
  }
  return "http://localhost:3000";
}
