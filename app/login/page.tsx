import type { Metadata } from "next";
import { LegalLinks } from "@/components/legal-links";
import { LoginForms } from "@/components/login-forms";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { signOut } from "@/lib/auth/actions";
import { getVerifiedSession, isNeonAuthConfigured } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Anmelden",
  description: "Konto anlegen oder anmelden. Die Sitzung wird auf dem Server geprüft.",
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
        description="Ihre Sitzung ist serverseitig geprüft."
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
        <LegalLinks prefix="Rechtliches:" />
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
          ? "E-Mail und Passwort oder Google. Die Sitzung wird auf dem Server geprüft."
          : "Anmeldung ist auf diesem Server nicht eingerichtet."
      }
    >
      {configured ? (
        <Card className="flex flex-col gap-6">
          <CardHeader>
            <CardTitle>Anmeldung</CardTitle>
            <p className="text-sm text-muted">
              Ein Konto, eine Sitzung. Kein zweites Anmeldesystem.
            </p>
          </CardHeader>
          <LoginForms />
        </Card>
      ) : (
        <p className="text-sm text-muted">
          Die Anmelde-Umgebung fehlt. Bitte später erneut versuchen.
        </p>
      )}
      <LegalLinks prefix="Mit der Nutzung gelten" />
    </PageShell>
  );
}
