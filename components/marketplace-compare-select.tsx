"use client";

import { useState } from "react";
import Link from "next/link";
import { MAX_COMPARE_SLUGS } from "@/lib/catalog/constants";

export type MarketplaceCompareAgent = {
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  category: string;
  categoryGroup?: string | null;
  tier: string;
  ratingStatus: string;
  modelAlias: string | null;
};

export function MarketplaceCompareSelect({
  agents,
}: {
  agents: MarketplaceCompareAgent[];
}) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(slug: string) {
    setSelected((current) => {
      if (current.includes(slug)) {
        return current.filter((item) => item !== slug);
      }
      if (current.length >= MAX_COMPARE_SLUGS) {
        return current;
      }
      return [...current, slug];
    });
  }

  const href = `/compare?slugs=${encodeURIComponent(selected.join(","))}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted">
          {selected.length}/{MAX_COMPARE_SLUGS} selected for compare
        </span>
        {selected.length > 0 ? (
          <Link className="underline underline-offset-4" href={href}>
            Compare selected
          </Link>
        ) : (
          <span className="text-muted">Select up to {MAX_COMPARE_SLUGS} agents</span>
        )}
      </div>
      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {agents.map((agent) => (
          <li key={agent.slug} className="flex items-start gap-3 py-4">
            <input
              className="mt-1"
              type="checkbox"
              checked={selected.includes(agent.slug)}
              onChange={() => toggle(agent.slug)}
              disabled={
                !selected.includes(agent.slug) &&
                selected.length >= MAX_COMPARE_SLUGS
              }
              aria-label={`Select ${agent.name} for compare`}
            />
            <div>
              <Link
                className="text-sm font-medium underline-offset-4 hover:underline"
                href={`/agents/${agent.slug}`}
              >
                {agent.name}
              </Link>
              <p className="mt-1 text-sm text-muted">
                {agent.tagline ?? agent.description}
              </p>
              <p className="mt-1 text-xs text-muted">
                {agent.categoryGroup
                  ? `${agent.categoryGroup} · ${agent.category}`
                  : agent.category}{" "}
                · {agent.tier} · {agent.ratingStatus}
                {agent.modelAlias ? ` · alias ${agent.modelAlias}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
