import { Badge } from "@/components/ui/badge";
import type {
  FailoverPresentation,
  MemoryNetworkPresentation,
} from "@/lib/runtime/status";

export function ChatStatusChips({
  failover,
  memoryNetwork,
}: {
  failover: FailoverPresentation;
  memoryNetwork: MemoryNetworkPresentation;
}) {
  const memoryTone =
    memoryNetwork.status === "connected"
      ? "accent"
      : memoryNetwork.status === "syncing"
        ? "outline"
        : memoryNetwork.status === "degraded"
          ? "warning"
          : "muted";

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-2" aria-label="Laufzeitstatus">
        <li>
          <Badge tone={failover.primary.configured ? "accent" : "muted"}>
            Primär {failover.primary.label}
            {failover.primary.configured ? "" : " · fehlt"}
          </Badge>
        </li>
        <li>
          <Badge tone={failover.failover.configured ? "outline" : "warning"}>
            Failover {failover.failover.label}
            {failover.failover.configured ? "" : " · TODO"}
          </Badge>
        </li>
        <li>
          <Badge tone={memoryTone}>{memoryNetwork.label}</Badge>
        </li>
      </ul>
      <p className="text-xs text-muted">{failover.notice}</p>
      <p className="text-xs text-muted">{memoryNetwork.notice}</p>
    </div>
  );
}
