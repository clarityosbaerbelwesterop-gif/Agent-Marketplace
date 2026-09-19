import { STUDIO_EDGES, STUDIO_NODES } from "@/lib/studio/graph";
import type { StudioNodeId, StudioStepStatus } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<StudioStepStatus, string> = {
  idle: "idle",
  queued: "queued",
  running: "running",
  succeeded: "done",
  failed: "failed",
};

export function StudioGraph({
  statuses,
}: {
  statuses: Record<StudioNodeId, StudioStepStatus>;
}) {
  return (
    <section
      className="relative flex min-h-0 flex-1 flex-col justify-center px-4 py-6 sm:px-8"
      aria-label="Studio graph"
    >
      <svg
        className="pointer-events-none absolute inset-x-[8%] top-1/2 hidden h-2 -translate-y-1/2 sm:block"
        viewBox="0 0 100 8"
        preserveAspectRatio="none"
        aria-hidden
      >
        {STUDIO_EDGES.map((edge, index) => {
          const x1 = 12.5 + index * 25;
          const x2 = x1 + 25;
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={x1}
              y1="4"
              x2={x2}
              y2="4"
              stroke="currentColor"
              strokeWidth="0.6"
              className="text-[#3a4a5c]"
              strokeDasharray="1.6 1.2"
            />
          );
        })}
      </svg>
      <ol className="relative z-10 grid gap-4 sm:grid-cols-4 sm:gap-6">
        {STUDIO_NODES.map((node, index) => {
          const status = statuses[node.id];
          return (
            <li key={node.id} className="flex flex-col gap-3">
              <article
                className="studio-node flex min-h-[10.5rem] flex-col gap-3 rounded-lg border bg-[#0d1219] p-4"
                data-status={status}
                aria-current={status === "running" ? "step" : undefined}
              >
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-[#8090a3]">
                  <span>{node.kicker}</span>
                  <span
                    className={cn(
                      status === "running" && "text-[#7ee0b3]",
                      status === "succeeded" && "text-[#7ee0b3]",
                      status === "failed" && "text-[#f07167]",
                      status === "queued" && "text-[#e2c36b]",
                    )}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                </div>
                <h2 className="text-xl tracking-tight text-[#eef3f8]">{node.label}</h2>
                <p className="text-xs leading-relaxed text-[#8090a3]">{node.blurb}</p>
              </article>
              {index < STUDIO_NODES.length - 1 ? (
                <p className="text-center text-[10px] uppercase tracking-[0.16em] text-[#4b5a6d] sm:hidden">
                  ↓ data flow
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
