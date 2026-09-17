import { Badge } from "@/components/ui/badge";
import { UI_FIXTURE_DISCLAIMER } from "@/lib/fixtures/agents";

export function FixtureNotice({ className }: { className?: string }) {
  return (
    <p className={className}>
      <Badge tone="warning">UI-Fixtures</Badge>{" "}
      <span className="text-sm text-muted">{UI_FIXTURE_DISCLAIMER}</span>
    </p>
  );
}
