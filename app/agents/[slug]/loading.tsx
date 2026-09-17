import { AgentCardSkeleton } from "@/components/ui/skeleton";

export default function AgentLoading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6">
      <div className="flex items-center gap-4">
        <div className="size-16 animate-pulse rounded-lg bg-border/70" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-8 w-48 animate-pulse rounded bg-border/70" />
          <div className="h-4 w-80 animate-pulse rounded bg-border/70" />
        </div>
      </div>
      <AgentCardSkeleton />
    </main>
  );
}
