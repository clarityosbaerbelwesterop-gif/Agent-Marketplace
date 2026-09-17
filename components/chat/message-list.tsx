import { EmptyState } from "@/components/ui/empty-state";
import type { ChatMessage } from "@/types/chat";
import { cn } from "@/lib/utils";

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  if (messages.length === 0) {
    return (
      <EmptyState
        title="Noch keine Nachrichten"
        description="Der Verlauf erscheint hier, sobald eine Miete aktiv ist und der Runtime-Workstream Nachrichten liefert."
        className="h-full min-h-64 justify-center"
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3" aria-live="polite">
      {messages.map((message) => (
        <li
          key={message.id}
          className={cn(
            "max-w-[42rem] rounded-[var(--radius-md)] border border-border px-4 py-3 text-sm leading-relaxed",
            message.role === "user"
              ? "self-end bg-accent-subtle"
              : "self-start bg-surface-raised",
          )}
        >
          <p className="text-xs uppercase tracking-[0.14em] text-muted">
            {message.role === "user" ? "Sie" : message.role === "agent" ? "Agent" : "System"}
          </p>
          <p className="mt-1">{message.content}</p>
        </li>
      ))}
    </ul>
  );
}
