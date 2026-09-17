import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { BackgroundJob } from "@/types/rental";

export function RunStatus({ jobs }: { jobs: BackgroundJob[] }) {
  return (
    <Card className="flex flex-col gap-3">
      <CardHeader>
        <CardTitle>Hintergrundjobs</CardTitle>
        <p className="text-sm text-muted">
          Statusfläche für Läufe außerhalb des Chats. Derzeit keine Runtime.
        </p>
      </CardHeader>
      {jobs.length === 0 ? (
        <p className="text-sm text-muted">Kein laufender Job.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {jobs.map((job) => (
            <li key={job.id} className="rounded-md border border-border px-3 py-2">
              <p className="font-medium">{job.label}</p>
              <p className="text-muted">
                {job.status}
                {job.detail ? ` · ${job.detail}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
