import { cn } from "@/lib/utils";
import type { AgentPalette } from "@/types/agent";

const palettes: Record<AgentPalette, string> = {
  ink: "bg-palette-ink text-palette-ink-fg",
  forest: "bg-palette-forest text-palette-forest-fg",
  ochre: "bg-palette-ochre text-palette-ochre-fg",
  slate: "bg-palette-slate text-palette-slate-fg",
  clay: "bg-palette-clay text-palette-clay-fg",
  sea: "bg-palette-sea text-palette-sea-fg",
};

export function AgentMark({
  initials,
  palette,
  size = "md",
}: {
  initials: string;
  palette: AgentPalette;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-display tracking-wide",
        palettes[palette],
        size === "sm" && "size-9 text-sm",
        size === "md" && "size-12 text-base",
        size === "lg" && "size-16 text-xl",
      )}
    >
      {initials}
    </span>
  );
}
