import { AgentIdentityMark } from "@/components/agent/agent-meta-badges";
import { GroundingChips } from "@/components/chat/grounding-chips";
import { ToolSteps } from "@/components/chat/tool-steps";
import { WorkingIndicator } from "@/components/chat/working-indicator";
import { EmptyState } from "@/components/ui/empty-state";
import type { ChatMessage } from "@/types/chat";
import { cn } from "@/lib/utils";

export function MessageList({
  messages,
  emptyDescription,
}: {
  messages: ChatMessage[];
  emptyDescription?: string;
}) {
  if (messages.length === 0) {
    return (
      <EmptyState
        title="Noch keine Nachrichten"
        description={
          emptyDescription ??
          "Der Verlauf erscheint hier, sobald eine aktive Miete streamt."
        }
        className="h-full min-h-64 justify-center"
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3" aria-live="polite">
      {messages.map((message) => {
        const speaker =
          message.role === "user"
            ? "Sie"
            : message.role === "system"
              ? "System"
              : (message.speaker ?? "Agent");
        return (
          <li
            key={message.id}
            className={cn(
              "flex max-w-[42rem] gap-3",
              message.role === "user" ? "self-end" : "self-start",
            )}
          >
            {message.role === "agent" ? (
              <AgentIdentityMark
                agent={{
                  name: speaker,
                  slug: message.speakerSlug ?? speaker,
                }}
                size="sm"
              />
            ) : null}
            <div
              className={cn(
                "flex-1 rounded-[var(--radius-md)] border border-border px-4 py-3 text-sm leading-relaxed",
                message.role === "user"
                  ? "bg-accent-subtle"
                  : "bg-surface-raised",
              )}
            >
              <p className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted">
                <span>{speaker}</span>
                {message.streaming ? (
                  <WorkingIndicator label="schreibt" />
                ) : null}
                {message.working && !message.streaming ? (
                  <WorkingIndicator label="arbeitet" />
                ) : null}
              </p>
              {message.content ? (
                <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
              ) : message.working || message.streaming ? (
                <p className="mt-1 text-muted">…</p>
              ) : null}
              {message.toolSteps && message.toolSteps.length > 0 ? (
                <ToolSteps steps={message.toolSteps} />
              ) : null}
              {message.role === "agent" && !message.streaming && message.grounding ? (
                <GroundingChips chips={message.grounding} />
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
