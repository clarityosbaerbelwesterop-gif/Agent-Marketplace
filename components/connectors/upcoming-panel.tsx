import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { UpcomingConnectorDefinition } from "@/lib/connectors/upcoming";

export function UpcomingConnectorPanel({
  items,
}: {
  items: UpcomingConnectorDefinition[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-2xl tracking-tight">Nächste Welle</h2>
        <p className="text-sm text-muted">
          Higgsfield, LinkedIn, Meta Ads und Google Search sind Grant-/OAuth-Shells.
          Es gibt keine Fake-Authorize-URLs und keine stillen Erfolgs-Grants.
        </p>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <li key={item.id}>
            <Card className="flex h-full flex-col gap-3">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle>{item.displayName}</CardTitle>
                  <Badge tone="warning">Backend folgt</Badge>
                </div>
                <p className="text-sm text-muted">{item.description}</p>
              </CardHeader>
              <p className="text-xs text-muted">
                {item.authKind === "oauth" ? "OAuth-Shell" : "API-Key-Shell"}
                {item.oauth ? ` · ${item.oauth.callbackPath}` : ""}
                {" · nicht grantable"}
              </p>
              <p className="text-xs text-muted">{item.notice}</p>
              {item.tenantSecretNames.length > 0 ? (
                <ul className="text-xs text-muted">
                  {item.tenantSecretNames.map((name) => (
                    <li key={name}>
                      <code className="font-mono">{name}</code>
                    </li>
                  ))}
                </ul>
              ) : null}
              <Button type="button" variant="secondary" disabled>
                Nicht verbunden
              </Button>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
