import { STUDIO_NODES } from "@/lib/studio/graph";
import type { StudioNodeId } from "@/lib/studio/types";

export type StudioLogEntry = {
  id: string;
  at: string;
  nodeId?: StudioNodeId;
  message: string;
};

function nodeLabel(nodeId: StudioNodeId | undefined): string {
  if (!nodeId) {
    return "graph";
  }
  return STUDIO_NODES.find((node) => node.id === nodeId)?.label ?? nodeId;
}

export function StudioRunLog({
  entries,
  running,
}: {
  entries: StudioLogEntry[];
  running: boolean;
}) {
  return (
    <section
      id="studio-log"
      className="flex h-[38vh] min-h-[12rem] flex-col border-t border-[#1b2430] bg-[#080b10]/95"
      aria-label="Run log"
    >
      <header className="flex items-center justify-between border-b border-[#1b2430] px-4 py-2 sm:px-8">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#8090a3]">
          Run log
        </p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#8090a3]">
          {running ? "streaming" : entries.length > 0 ? "idle" : "ready"}
        </p>
      </header>
      <ol
        className="flex-1 overflow-auto px-4 py-3 font-mono text-xs leading-relaxed sm:px-8"
        role="log"
        aria-live="polite"
      >
        {entries.length === 0 ? (
          <li className="text-[#8090a3]">
            Waiting for a run. One pass: Plan → Tools → Verify → PR.
          </li>
        ) : (
          entries.map((entry) => (
            <li key={entry.id} className="grid grid-cols-[5.5rem_4.5rem_minmax(0,1fr)] gap-3 py-0.5">
              <time className="text-[#4b5a6d]" dateTime={entry.at}>
                {entry.at.slice(11, 19)}
              </time>
              <span className="text-[#7ee0b3]">{nodeLabel(entry.nodeId)}</span>
              <span className="whitespace-pre-wrap text-[#d7deea]">{entry.message}</span>
            </li>
          ))
        )}
      </ol>
    </section>
  );
}
