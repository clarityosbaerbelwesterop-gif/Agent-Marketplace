import type { Metadata } from "next";
import { LoginForms } from "@/components/login-forms";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { signOut } from "@/lib/auth/actions";
import { getVerifiedSession, isNeonAuthConfigured } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Anmelden",
  description: "Neon Auth (Managed Better Auth). Kein zweites Auth-System.",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const configured = isNeonAuthConfigured();
  const session = await getVerifiedSession();

  if (session?.user) {
    return (
      <PageShell
        width="narrow"
        eyebrow="Konto"
        title="Angemeldet"
        description="Sitzung serverseitig gegen Neon Auth geprüft."
      >
        <Card className="flex flex-col gap-5">
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Name</dt>
              <dd>{session.user.name || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">E-Mail</dt>
              <dd>{session.user.email || "—"}</dd>
            </div>
          </dl>
          <form action={signOut}>
            <Button type="submit" variant="secondary">
              Abmelden
            </Button>
          </form>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      width="wide"
      eyebrow="Konto"
      title="Anmelden"
      description={
        configured
          ? "E-Mail/Passwort oder Google über Neon Auth. Sessions werden auf dem Server geprüft."
          : "Neon-Auth-Umgebungsvariablen fehlen — Anmeldung kann hier nicht laufen."
      }
    >
      {configured ? (
        <Card className="flex flex-col gap-6">
          <CardHeader>
            <CardTitle>Neon Auth</CardTitle>
            <p className="text-sm text-muted">
              Kein zweites Auth-System. Kein lokales Passwort-Konto außerhalb von
              Neon Auth.
            </p>
          </CardHeader>
          <LoginForms />
        </Card>
      ) : (
        <p className="text-sm text-muted">
          Setzen Sie <code className="font-mono">NEON_AUTH_BASE_URL</code> und{" "}
          <code className="font-mono">NEON_AUTH_COOKIE_SECRET</code>.
        </p>
      )}
    </PageShell>
  );
}
