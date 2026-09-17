import { formatMoney } from "@/lib/format";
import type { AgentRentalDuration } from "@/lib/db/json";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function DurationOptions({
  durations,
  selectedId,
  hrefFor,
}: {
  durations: AgentRentalDuration[];
  selectedId?: string;
  hrefFor: (durationId: string) => string;
}) {
  if (durations.length === 0) {
    return (
      <p className="text-sm text-muted">Keine Mietdauer im Katalog hinterlegt.</p>
    );
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium">Mietdauer</legend>
      <div className="grid gap-2">
        {durations.map((duration) => {
          const active = duration.id === selectedId;
          return (
            <Link
              key={duration.id}
              href={hrefFor(duration.id)}
              className={cn(
                "flex items-center justify-between rounded-md border px-3 py-3 text-sm transition-colors",
                active
                  ? "border-accent bg-accent-subtle"
                  : "border-border bg-surface-raised hover:bg-accent-subtle/60",
              )}
              aria-current={active ? "true" : undefined}
            >
              <span>{duration.label}</span>
              <span className="tabular font-medium">
                {formatMoney({
                  amountCents: duration.priceCents,
                  currency: duration.currency,
                })}
              </span>
            </Link>
          );
        })}
      </div>
    </fieldset>
  );
}
