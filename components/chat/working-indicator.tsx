import { cn } from "@/lib/utils";

export function WorkingIndicator({
  label = "arbeitet",
}: {
  label?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted" role="status">
      <span className="working-pulse inline-flex gap-0.5" aria-hidden>
        <span className="size-1.5 rounded-full bg-accent" />
        <span className="size-1.5 rounded-full bg-accent" />
        <span className="size-1.5 rounded-full bg-accent" />
      </span>
      <span className={cn("working-pulse")}>{label}</span>
    </span>
  );
}
