import type { AgentTier } from "@/lib/catalog/constants";
import { TIER_RUNTIME_POLICY } from "./types";

const GROUNDING_CORE =
  "Ground answers in tools, memory, user files, and connector results. Say unknown when unknown. Never invent benchmarks, success rates, user counts, or catalog metrics.";

export function groundingInstructions(tier: AgentTier): string {
  const policy = TIER_RUNTIME_POLICY[tier];
  if (policy.planning === "strong") {
    return [
      GROUNDING_CORE,
      "When you claim a fact, cite the source as [memory:<id>] or [tool:<name>] or [file:<label>].",
      "If you cannot cite a tool, memory, or user-supplied file, refuse the claim and say you do not know.",
      "Do not fill gaps with plausible numbers.",
    ].join(" ");
  }
  if (policy.planning === "structured") {
    return [
      GROUNDING_CORE,
      "Prefer a short citation ([memory:<id>] or [tool:<name>]) when stating stored facts.",
      "If a figure is not in tools, memory, or the user message, say it is unknown.",
    ].join(" ");
  }
  return GROUNDING_CORE;
}

export function citationRequired(tier: AgentTier): boolean {
  return TIER_RUNTIME_POLICY[tier].planning !== "brief";
}

export function looksUngroundedMetric(text: string): boolean {
  const hasNumberedMetric =
    /\d[\d,]*(?:\.\d+)?\s*%/.test(text) ||
    /\b\d[\d,]*\s+(?:users?|customers?)\b/i.test(text) ||
    (/\b(?:benchmark|success rate|win rate|accuracy)\b/i.test(text) &&
      /\d/.test(text));
  if (!hasNumberedMetric) {
    return false;
  }
  return !/\[(memory|tool|file):[^\]]+\]/i.test(text);
}
