import { AgentIdentityMark } from "@/components/agent/agent-meta-badges";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { formatMoney } from "@/lib/format";
import { TIER_LABELS } from "@/lib/labels";
import { checkoutHref } from "@/lib/urls";
import { formatUsage, isUntested, pickDuration } from "@/lib/ui/agent-presentation";
import { AGENT_TYPE_LABELS, agentTypeForCategory } from "@/lib/catalog/agent-types";
import type { AgentCompareItem } from "@/lib/catalog/types";
import Link from "next/link";
import type { ReactNode } from "react";

function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <tr className="border-t border-border align-top">
      <th className="w-36 py-3 pr-4 text-left text-xs font-medium uppercase tracking-[0.14em] text-muted">
        {label}
      </th>
      {children}
    </tr>
  );
}

export function CompareTable({
  agents,
  durationId,
}: {
  agents: AgentCompareItem[];
  durationId?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-surface-raised">
      <table className="min-w-[720px] w-full border-collapse text-sm">
        <caption className="sr-only">
          Vergleich ausgewählter Agenten nach Stufe, Preis, Fähigkeiten und
          Konnektoren
        </caption>
        <thead>
          <tr>
            <th className="w-36 p-4" />
            {agents.map((agent) => (
              <th key={agent.slug} className="p-4 text-left font-normal">
                <div className="flex items-center gap-3">
                  <AgentIdentityMark agent={agent} size="sm" />
                  <div>
                    <Link
                      href={`/agents/${agent.slug}`}
                      className="font-display text-xl hover:underline"
                    >
                      {agent.name}
                    </Link>
                    {isUntested(agent) ? (
                      <Badge tone="warning" className="ml-2">
                        Ungeprüft
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <Row label="Stufe">
            {agents.map((agent) => (
              <td key={agent.slug} className="p-4">
                {TIER_LABELS[agent.tier]}
              </td>
            ))}
          </Row>
          <Row label="Modellalias">
            {agents.map((agent) => (
              <td key={agent.slug} className="p-4">
                {agent.modelAlias ?? agent.tier}
              </td>
            ))}
          </Row>
          <Row label="Typ">
            {agents.map((agent) => {
              const type = agentTypeForCategory(agent.category);
              return (
                <td key={agent.slug} className="p-4">
                  {type ? AGENT_TYPE_LABELS[type] : "—"}
                </td>
              );
            })}
          </Row>
          <Row label="Kategorie">
            {agents.map((agent) => (
              <td key={agent.slug} className="p-4">
                {agent.category}
              </td>
            ))}
          </Row>
          <Row label="Preis">
            {agents.map((agent) => {
              const duration = pickDuration(agent, durationId);
              return (
                <td key={agent.slug} className="p-4 tabular font-medium">
                  {duration
                    ? `${formatMoney({
                        amountCents: duration.priceCents,
                        currency: duration.currency,
                      })} · ${duration.label}`
                    : "—"}
                </td>
              );
            })}
          </Row>
          <Row label="Inklusive">
            {agents.map((agent) => {
              const duration = pickDuration(agent, durationId);
              return (
                <td key={agent.slug} className="p-4">
                  {duration ? formatUsage(agent, duration) : "—"}
                </td>
              );
            })}
          </Row>
          <Row label="Fähigkeiten">
            {agents.map((agent) => (
              <td key={agent.slug} className="p-4">
                {agent.skills.length === 0
                  ? "—"
                  : agent.skills.map((skill) => (
                      <p key={`${skill.slug}@${skill.version}`} className="mb-2">
                        <span className="font-mono text-xs">
                          {skill.slug}@{skill.version}
                        </span>
                        {skill.summary ? (
                          <span className="mt-1 block text-muted">{skill.summary}</span>
                        ) : null}
                      </p>
                    ))}
              </td>
            ))}
          </Row>
          <Row label="Konnektoren">
            {agents.map((agent) => (
              <td key={agent.slug} className="p-4">
                {agent.connectors.map((item) => item.provider).join(", ") || "—"}
              </td>
            ))}
          </Row>
          <tr className="border-t border-border">
            <th className="p-4" />
            {agents.map((agent) => (
              <td key={agent.slug} className="p-4">
                <ButtonLink
                  href={checkoutHref(agent.slug, pickDuration(agent, durationId)?.id)}
                  size="sm"
                >
                  Zur Miete
                </ButtonLink>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
