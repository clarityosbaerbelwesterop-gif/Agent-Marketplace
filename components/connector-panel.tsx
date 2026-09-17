"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ConnectorCatalogItem } from "@/lib/connectors";
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

export function ConnectorPanel({
  rentalId,
  items,
  compact = false,
}: {
  rentalId: string;
  items: ConnectorCatalogItem[];
  compact?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>(
    {},
  );

  async function connect(item: ConnectorCatalogItem) {
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
        setError(payload.detail || "Grant ist ausstehend. OAuth oder Tenant-Secrets sind nötig.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verbinden fehlgeschlagen");
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(item: ConnectorCatalogItem) {
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

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="flex flex-col gap-3">
        {items.map((item) => {
          const connected = item.grant?.status === "active";
          return (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-border bg-surface-raised p-4 shadow-card"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-medium">
                  {connectorUiName(item.id, item.displayName)}
                </h2>
                <span className="text-xs text-muted">{statusLabel(item)}</span>
              </div>
              {compact ? null : (
                <>
                  <p className="text-sm text-muted">
                    {connectorUiDescription(item.id, item.description)}
                  </p>
                  <p className="text-xs text-muted">
                    {item.capabilityTags.join(" · ")}
                    {item.oauth ? ` · callback ${item.oauth.callbackPath}` : null}
                    {item.oauth && !item.oauthConfigured
                      ? " · OAuth env not set"
                      : null}
                  </p>
                </>
              )}
              {connected ? null : (
                <div className="flex flex-col gap-2">
                  {item.tenantSecretNames.map((name) => (
                    <label key={name} className="text-xs text-muted">
                      {name}
                      <input
                        className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 font-mono text-sm text-foreground"
                        type="password"
                        autoComplete="off"
                        value={drafts[item.id]?.[name] ?? ""}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [item.id]: {
                              ...(current[item.id] ?? {}),
                              [name]: event.target.value,
                            },
                          }))
                        }
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
                    onClick={() => disconnect(item)}
                    disabled={busy === item.id}
                  >
                    {busy === item.id ? "Arbeitet…" : "Trennen"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => connect(item)}
                    disabled={busy === item.id}
                  >
                    {busy === item.id ? "Arbeitet…" : "Verbinden"}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
