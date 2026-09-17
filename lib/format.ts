import type { Money } from "@/types/agent";

export function formatMoney(money: Money): string {
  const currency = money.currency || "EUR";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
  }).format(money.amountCents / 100);
}

export function formatPriceFrom(money: Money, unit: string): string {
  return `ab ${formatMoney(money)} / ${unit}`;
}
