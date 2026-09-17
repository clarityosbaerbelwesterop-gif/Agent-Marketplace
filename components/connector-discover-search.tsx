"use client";

import { useState, type FormEvent } from "react";
import type { DiscoverySearchResult } from "@/lib/connectors/discovery";

export function ConnectorDiscoverSearch() {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiscoverySearchResult | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set("q", query.trim());
      }
      const response = await fetch(`/api/connectors/discover?${params.toString()}`);
      const payload = (await response.json()) as DiscoverySearchResult & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Discovery failed");
      }
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-wrap items-end gap-3" onSubmit={onSubmit}>
        <label className="text-sm">
          Search MCP catalogs
          <input
            className="mt-1 w-full min-w-64 rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="github, filesystem, slack…"
          />
        </label>
        <button
          className="rounded-md border border-border px-3 py-2 text-sm font-medium disabled:opacity-60"
          type="submit"
          disabled={busy}
        >
          {busy ? "Searching…" : "Search"}
        </button>
      </form>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {result ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">{result.notice}</p>
          {result.warnings.length > 0 ? (
            <ul className="text-sm text-muted">
              {result.warnings.map((warning) => (
                <li key={warning.source}>
                  {warning.source}: {warning.error}
                </li>
              ))}
            </ul>
          ) : null}
          {result.items.length === 0 ? (
            <p className="text-sm text-muted">No catalog matches.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border border-y border-border">
              {result.items.map((item) => (
                <li key={`${item.source}:${item.sourceRef}`} className="py-3 text-sm">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted">
                    {item.source}
                    {item.repoUrl ? (
                      <>
                        {" · "}
                        <a
                          className="underline underline-offset-4"
                          href={item.repoUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {item.repoUrl}
                        </a>
                      </>
                    ) : (
                      " · no public repo URL"
                    )}
                  </p>
                  {item.description ? (
                    <p className="mt-1 text-muted">{item.description}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted">Not grantable · untrusted catalog row</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
