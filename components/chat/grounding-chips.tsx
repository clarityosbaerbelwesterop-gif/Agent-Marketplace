import { Badge } from "@/components/ui/badge";
import type { ChatGroundingChip } from "@/types/chat";

export function GroundingChips({ chips }: { chips: ChatGroundingChip[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Quellen">
      {chips.map((chip, index) => (
        <li key={`${chip.kind}-${chip.label}-${index}`}>
          <Badge tone={chip.kind === "unconfirmed" ? "warning" : "outline"}>
            {chip.label}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
