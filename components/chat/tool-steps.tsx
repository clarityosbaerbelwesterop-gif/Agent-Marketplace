import type { ChatToolStep } from "@/types/chat";
import { cn } from "@/lib/utils";

export function ToolSteps({ steps }: { steps: ChatToolStep[] }) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <ol className="mt-2 flex flex-col gap-1.5" aria-label="Werkzeugschritte">
      {steps.map((step, index) => (
        <li
          key={`${step.name}-${index}`}
          className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs"
        >
          <p className="flex flex-wrap items-center gap-2 font-medium">
            <span>{step.name}</span>
            <span
              className={cn(
                step.status === "start" && "working-pulse text-warning",
                step.status === "done" && "text-success",
                step.status === "error" && "text-danger",
              )}
            >
              {step.status === "start"
                ? "läuft"
                : step.status === "done"
                  ? "fertig"
                  : "Fehler"}
            </span>
          </p>
          {step.detail ? (
            <p className="mt-1 line-clamp-3 text-muted">{step.detail}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
