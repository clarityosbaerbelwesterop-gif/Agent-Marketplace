import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { connectorUiName } from "@/lib/labels";

export function ToolsPanel({ connectors }: { connectors: string[] }) {
  return (
    <Card className="flex flex-col gap-4">
      <CardHeader>
        <CardTitle>Werkzeuge</CardTitle>
        <p className="text-sm text-muted">
          Konnektor-Grants laufen über `/connectors`. OAuth/API-Keys sind
          Tenant-Grants, kein Marketplace-Checkout.
        </p>
      </CardHeader>
      <ul className="flex flex-col gap-3">
        {connectors.map((id) => (
          <li
            key={id}
            className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {connectorUiName(id, id)}
              </p>
              <Badge tone="muted">Getrennt</Badge>
            </div>
            <Button type="button" size="sm" variant="secondary" disabled>
              Verbinden — folgt
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
