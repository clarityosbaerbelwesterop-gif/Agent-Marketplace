import { STUDIO_CAPABILITY_LABELS } from "./graph";
import type { StudioCapabilityId, StudioPlan } from "./types";

const HINTS: Array<{ id: StudioCapabilityId; pattern: RegExp }> = [
  { id: "scm", pattern: /\b(git|repo|branch|pull request|pr|diff|commit)\b/i },
  { id: "deploy", pattern: /\b(deploy|preview|hosting|release)\b/i },
  { id: "db", pattern: /\b(sql|schema|database|migration|query)\b/i },
  { id: "auth", pattern: /\b(auth|login|session|oauth)\b/i },
  { id: "payments", pattern: /\b(payment|billing|invoice|checkout)\b/i },
  { id: "search", pattern: /\b(search|index|query string)\b/i },
  { id: "chat", pattern: /\b(message|chat|channel|notify)\b/i },
  { id: "storage", pattern: /\b(file|blob|upload|storage)\b/i },
  { id: "media", pattern: /\b(image|video|media|render)\b/i },
  { id: "social", pattern: /\b(social|profile|follow)\b/i },
  { id: "ads", pattern: /\b(ad|campaign|ads)\b/i },
  { id: "ai", pattern: /\b(model|prompt|embedding)\b/i },
];

const DEFAULT_CAPABILITIES: StudioCapabilityId[] = ["scm", "deploy"];

export function planFromBrief(brief: string): StudioPlan {
  const goal = brief.trim() || "Untitled change";
  const capabilities = inferCapabilities(goal);
  return {
    goal,
    outline: [
      "Restate the goal and keep the graph to one pass.",
      `Select tools by capability: ${capabilities
        .map((id) => STUDIO_CAPABILITY_LABELS[id])
        .join(", ")}.`,
      "Hand verify to the shared execution hook. Do not run a local verifier.",
      "Hand the change request to the same hook.",
    ],
    capabilities,
  };
}

export function inferCapabilities(brief: string): StudioCapabilityId[] {
  const found: StudioCapabilityId[] = [];
  for (const hint of HINTS) {
    if (hint.pattern.test(brief) && !found.includes(hint.id)) {
      found.push(hint.id);
    }
  }
  return found.length > 0 ? found : [...DEFAULT_CAPABILITIES];
}
