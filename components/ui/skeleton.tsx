import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-border/70", className)}
      aria-hidden
    />
  );
}

export function AgentCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-surface-raised p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <Skeleton className="h-16 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}
