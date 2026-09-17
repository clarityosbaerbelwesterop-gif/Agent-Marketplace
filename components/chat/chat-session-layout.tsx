import { AgentIdentityMark } from "@/components/agent/agent-meta-badges";
import { ChatComposer } from "@/components/chat/chat-composer";
import { MessageList } from "@/components/chat/message-list";
import { RunStatus } from "@/components/chat/run-status";
import { ToolsPanel } from "@/components/chat/tools-panel";
import { Badge } from "@/components/ui/badge";
import type { AgentDetail } from "@/lib/catalog/types";
import type { ChatMessage } from "@/types/chat";
import type { BackgroundJob } from "@/types/rental";

export function ChatSessionLayout({
  agent,
  messages,
  jobs,
  preview,
}: {
  agent: AgentDetail;
  messages: ChatMessage[];
  jobs: BackgroundJob[];
  preview: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface-raised p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <AgentIdentityMark agent={agent} />
          <div>
            <h1 className="font-display text-3xl tracking-tight">{agent.name}</h1>
            <p className="text-sm text-muted">{agent.tagline ?? agent.description}</p>
          </div>
        </div>
        {preview ? (
          <Badge tone="warning">UI-Vorschau · Keine aktive Miete</Badge>
        ) : (
          <Badge tone="accent">Aktive Miete</Badge>
        )}
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_20rem]">
        <section className="flex min-h-[28rem] flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-surface-raised p-5">
          <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-muted">
            Verlauf
          </h2>
          <div className="flex-1">
            <MessageList messages={messages} />
          </div>
          <ChatComposer disabled />
        </section>
        <aside className="flex flex-col gap-4">
          <ToolsPanel connectors={agent.connectors.map((item) => item.provider)} />
          <RunStatus jobs={jobs} />
        </aside>
      </div>
    </div>
  );
}
