export type RouterLaneId = "unorouter" | "freellm";

export type RouterLaneStatus = {
  id: RouterLaneId;
  label: string;
  configured: boolean;
};

export type FailoverPresentation = {
  primary: RouterLaneStatus;
  failover: RouterLaneStatus;
  /** Never invent a live health meter. */
  liveMeter: false;
  notice: string;
};

export type MemoryNetworkStatus =
  | "connected"
  | "syncing"
  | "degraded"
  | "unavailable";

export type MemoryNetworkPresentation = {
  status: MemoryNetworkStatus;
  label: string;
  notice: string;
  source: "env" | "stub";
};

const MEMORY_STATUS_SET = new Set<string>([
  "connected",
  "syncing",
  "degraded",
  "unavailable",
]);

export function getFailoverPresentation(
  env: Record<string, string | undefined> = process.env,
): FailoverPresentation {
  const primaryConfigured = Boolean(env.UNOROUTER_API_KEY?.trim());
  const failoverConfigured = Boolean(
    env.FREELLM_API_KEY?.trim() || env.FREELLM_BASE_URL?.trim(),
  );
  return {
    primary: {
      id: "unorouter",
      label: "Modell-Router",
      configured: primaryConfigured,
    },
    failover: {
      id: "freellm",
      label: "Failover-Router",
      configured: failoverConfigured,
    },
    liveMeter: false,
    notice: failoverConfigured
      ? "Failover-Router ist konfiguriert. Kein Live-Meter — der Run speichert provider_used."
      : "TODO: Failover-Router ist nicht konfiguriert. Kein simuliertes Live-Meter.",
  };
}

export function getMemoryNetworkPresentation(
  env: Record<string, string | undefined> = process.env,
): MemoryNetworkPresentation {
  const raw = env.MEMORY_NETWORK_STATUS?.trim().toLowerCase();
  if (raw && MEMORY_STATUS_SET.has(raw)) {
    const status = raw as MemoryNetworkStatus;
    return {
      status,
      label: memoryNetworkLabel(status),
      notice:
        "Status kommt aus MEMORY_NETWORK_STATUS. Keine erfundenen Sync-Zahlen.",
      source: "env",
    };
  }
  if (env.MEMORY_NETWORK_URL?.trim()) {
    return {
      status: "syncing",
      label: memoryNetworkLabel("syncing"),
      notice:
        "MEMORY_NETWORK_URL ist gesetzt. Verbindungsqualität folgt dem Memory-Netzwerk-Backend.",
      source: "env",
    };
  }
  return {
    status: "unavailable",
    label: memoryNetworkLabel("unavailable"),
    notice:
      "TODO: Live Speichernetz-Meter folgt. Workspace-Memories sind serverseitig; kein erfundener Sync-Stand.",
    source: "stub",
  };
}

export function memoryNetworkLabel(status: MemoryNetworkStatus): string {
  switch (status) {
    case "connected":
      return "Speichernetz: verbunden";
    case "syncing":
      return "Speichernetz: synchronisiert";
    case "degraded":
      return "Speichernetz: eingeschränkt";
    case "unavailable":
      return "Speichernetz: nicht verbunden";
  }
}
