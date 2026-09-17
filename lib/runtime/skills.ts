import type { AgentSkill } from "@/lib/db";
import type { AgentTier } from "@/lib/catalog/constants";
import { TIER_RUNTIME_POLICY } from "./types";
import { groundingInstructions, looksUngroundedMetric } from "./grounding";

export function planningInstructions(tier: AgentTier): string {
  const policy = TIER_RUNTIME_POLICY[tier];
  if (policy.planning === "strong") {
    return [
      "Plan before acting: restate the goal, list tools you may need, then execute.",
      "After each tool result, check whether it actually answers the question.",
      "If a tool fails or the result is empty, retry with a tighter argument before giving up.",
      "Prefer real tool results over guessing. If you did not call a tool, do not claim you read memory, connectors, or external APIs.",
      "Do not invent metrics, user counts, benchmark scores, or successful API outcomes.",
    ].join(" ");
  }
  if (policy.planning === "structured") {
    return [
      "Outline a short plan, pick a tool only when it is required, then answer.",
      "If a tool fails, try once more with corrected input.",
      "Prefer real tool results over guessing. Never invent connector or memory outcomes.",
      "Do not invent metrics, user counts, or benchmark scores.",
    ].join(" ");
  }
  return [
    "Answer directly. Use a tool only when the user asks for stored notes or a connector.",
    "Prefer real tool results over guessing. If no tool ran, say so instead of fabricating results.",
    "Do not invent metrics, user counts, or benchmark scores.",
  ].join(" ");
}

export function buildSystemPrompt(input: {
  agentName: string;
  agentDescription: string;
  tier: AgentTier;
  skill: AgentSkill | null;
  memories: Array<{ kind: string; content: string; id?: string }>;
  connectorSummary?: string;
  networkSummary?: string;
  extraInstructions?: string;
}): string {
  const sections = [
    `You are ${input.agentName}, a rented marketplace agent.`,
    input.agentDescription,
    planningInstructions(input.tier),
    groundingInstructions(input.tier),
    "First-party connectors include neon, github, slack, vercel, supabase, render, stripe, cursor, higgsfield, linkedin, meta, and google-search. Only use connector tools that were provided. Never invent credentials, resources, or successful API results.",
  ];
  if (input.connectorSummary) {
    sections.push(input.connectorSummary);
  }
  if (input.networkSummary) {
    sections.push(input.networkSummary);
  }
  if (input.extraInstructions) {
    sections.push(input.extraInstructions);
  }
  if (input.skill) {
    sections.push(
      `Skill package ${input.skill.slug}@${input.skill.version}:`,
      input.skill.instructions,
    );
    const checks = input.skill.checkCriteria?.checks ?? [];
    if (checks.length > 0) {
      sections.push(
        "Check criteria:",
        checks.map((check) => `- ${check.id}: ${check.description}`).join("\n"),
      );
    }
  }
  if (input.memories.length > 0) {
    sections.push(
      "Relevant memories for this user and workspace:",
      input.memories
        .slice(0, 8)
        .map(
          (memory) =>
            `- (${memory.kind}${memory.id ? ` id=${memory.id}` : ""}) ${memory.content}`,
        )
        .join("\n"),
    );
  }
  return sections.filter(Boolean).join("\n\n");
}

export function resultCheckPrompt(outputText: string, skill: AgentSkill): string {
  const checks = skill.checkCriteria?.checks ?? [];
  return [
    "Score the assistant draft against the skill checks.",
    "Reply with JSON only: {\"pass\": boolean, \"notes\": string}.",
    "Fail the draft if it invents benchmarks, success rates, or user counts, or if it states catalog metrics without a [memory:], [tool:], or [file:] citation.",
    "Checks:",
    checks.map((check) => `- ${check.id}: ${check.description}`).join("\n") ||
      "- on-scope: stays on the assigned work",
    "Draft:",
    outputText.slice(0, 8000),
  ].join("\n");
}

export function groundingCheckNotes(outputText: string): string | null {
  if (looksUngroundedMetric(outputText)) {
    return "Draft appears to claim metrics without a tool, memory, or file citation.";
  }
  return null;
}
