export type GroundingChip = {
  kind: "skill" | "unconfirmed";
  label: string;
};

/**
 * Show cited skill/source chips only when the runtime actually emitted them.
 * Never invent citations or success rates.
 */
export function groundingChips(input: {
  skillVersion?: string | null;
  sources?: string[] | null;
}): GroundingChip[] {
  const chips: GroundingChip[] = [];
  const skill = input.skillVersion?.trim();
  if (skill) {
    chips.push({ kind: "skill", label: skill });
  }
  for (const source of input.sources ?? []) {
    const label = source.trim();
    if (label) {
      chips.push({ kind: "skill", label });
    }
  }
  if (chips.length === 0) {
    chips.push({ kind: "unconfirmed", label: "Quelle nicht bestätigt" });
  }
  return chips;
}
