"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  partitionConnectorCatalog,
  type ConnectorCatalogItem,
} from "@/lib/connectors";
import { connectorUiDescription, connectorUiName } from "@/lib/labels";

function statusLabel(item: ConnectorCatalogItem): string {
  if (!item.grant) {
    return "Nicht verbunden";
  }
  if (item.grant.status === "active") {
    return item.grant.hasCredentials
      ? "Verbunden"
      : "Gewährt (keine Zugangsdaten)";
  }
  if (item.grant.status === "pending") {
    return "Ausstehend";
  }
  return "Widerrufen";
}

function navigateExternal(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function ConnectorCard({
  item,
  rentalId,
  compact,
  busy,
  drafts,
  onDraft,
  onConnect,
  onDisconnect,
}: {
  item: ConnectorCatalogItem;
  rentalId: string | null;
  compact: boolean;
  busy: string | null;
  drafts: Record<string, Record<string, string>>;
  onDraft: (id: string, name: string, value: string) => void;
  onConnect: (item: ConnectorCatalogItem) => void;
  onDisconnect: (item: ConnectorCatalogItem) => void;
}) {
  const connected = item.grant?.status === "active";
  const requestable = Boolean(rentalId);
  const stub = item.wave === "stub";

  return (
    <li className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-border bg-surface-raised p-4 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-medium">
          {connectorUiName(item.id, item.displayName)}
        </h3>
        <span className="text-xs text-muted">
          {stub ? "stub · " : "grantable · "}
          {statusLabel(item)}
        </span>
      </div>
      {compact ? null : (
        <>
          <p className="text-sm text-muted">
            {connectorUiDescription(item.id, item.description)}
          </p>
          <p className="text-xs text-muted">
            {item.capabilityTags.join(" · ")}
            {item.oauth ? ` · callback ${item.oauth.callbackPath}` : null}
            {item.oauth && !item.oauthConfigured ? " · OAuth env not set" : null}
            {stub ? " · kein Fake-OAuth" : null}
          </p>
        </>
      )}
      {connected || !requestable ? null : (
        <div className="flex flex-col gap-2">
          {item.tenantSecretNames.map((name) => (
            <label key={name} className="text-xs text-muted">
              {name}
              <input
                className="mt-1 w-full rounded-[var(--radius-md)] border border-border bg-surface-raised px-3 py-2 font-mono text-sm text-foreground"
                type="password"
                autoComplete="off"
                value={drafts[item.id]?.[name] ?? ""}
                onChange={(event) => onDraft(item.id, name, event.target.value)}
              />
            </label>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {connected ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onDisconnect(item)}
            disabled={!requestable || busy === item.id}
          >
            {busy === item.id ? "Arbeitet…" : "Trennen"}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={() => onConnect(item)}
            disabled={!requestable || busy === item.id}
          >
            {busy === item.id
              ? "Arbeitet…"
              : requestable
                ? "Verbinden"
                : "Aktive Miete nötig"}
          </Button>
        )}
      </div>
    </li>
  );
}

export function ConnectorPanel({
  rentalId,
  items,
  compact = false,
}: {
  rentalId: string | null;
  items: ConnectorCatalogItem[];
  compact?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>(
    {},
  );
  const { firstWave, stubs } = partitionConnectorCatalog(items);

  function setDraft(id: string, name: string, value: string) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? {}),
        [name]: value,
      },
    }));
  }

  async function connect(item: ConnectorCatalogItem) {
    if (!rentalId) {
      setError("Aktive Miete nötig, um First-Wave-Grants anzufordern.");
      return;
    }
    setBusy(item.id);
    setError(null);
    try {
      const credentials = drafts[item.id] ?? {};
      const hasSecrets = item.tenantSecretNames.some((name) =>
        Boolean(credentials[name]?.trim()),
      );
      const response = await fetch("/api/connectors/grants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rentalId,
          provider: item.id,
          scopes: item.requiredScopes,
          ...(hasSecrets ? { credentials } : {}),
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        authorizeUrl?: string | null;
        detail?: string;
        grant?: { status?: string };
      };
      if (!response.ok) {
        throw new Error(payload.error || "Verbinden fehlgeschlagen");
      }
      if (payload.authorizeUrl) {
        navigateExternal(payload.authorizeUrl);
        return;
      }
      if (payload.grant?.status !== "active") {
        setError(
          payload.detail ||
            "Grant ist ausstehend. OAuth oder Tenant-Secrets sind nötig.",
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verbinden fehlgeschlagen");
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(item: ConnectorCatalogItem) {
    if (!rentalId) {
      return;
    }
    setBusy(item.id);
    setError(null);
    try {
      const response = await fetch(
        `/api/connectors/grants?rentalId=${rentalId}&provider=${item.id}`,
        { method: "DELETE" },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Trennen fehlgeschlagen");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trennen fehlgeschlagen");
    } finally {
      setBusy(null);
    }
  }

  const cardProps = {
    rentalId,
    compact,
    busy,
    drafts,
    onDraft: setDraft,
    onConnect: connect,
    onDisconnect: disconnect,
  };

  return (
    <div className="flex flex-col gap-8">
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-tight">First-Wave</h2>
          <p className="text-sm text-muted">
            Requestable für diese Miete. Grants bleiben pending, bis OAuth oder
            Tenant-Secrets wirklich ankommen — keine Fake-Tokens.
          </p>
        </div>
        <ul className="flex flex-col gap-3">
          {firstWave.map((item) => (
            <ConnectorCard key={item.id} item={item} {...cardProps} />
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-tight">Grant-Stubs</h2>
          <p className="text-sm text-muted">
            Zweite Welle: Katalog + Stub. Kein Fake-OAuth. Tenant-Secrets
            speichern den Grant; sonst bleibt er pending.
          </p>
        </div>
        <ul className="flex flex-col gap-3">
          {stubs.map((item) => (
            <ConnectorCard key={item.id} item={item} {...cardProps} />
          ))}
        </ul>
      </section>
    </div>
  );
}
