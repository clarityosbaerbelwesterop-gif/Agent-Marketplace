import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { loginHref } from "@/lib/login";
import Link from "next/link";

type LoginMethod = "magic" | "password";

export function LoginPanel({ method }: { method: LoginMethod }) {
  return (
    <Card className="flex flex-col gap-6">
      <CardHeader>
        <CardTitle>Anmelden</CardTitle>
        <p className="text-sm leading-relaxed text-muted">
          Platzhalter-Anmeldung. Es gibt kein zweites Anmeldesystem und keine
          funktionierende Sitzung in dieser Ansicht.
        </p>
      </CardHeader>

      <nav aria-label="Anmeldeart" className="grid grid-cols-2 gap-2">
        <Link
          href={loginHref("magic")}
          aria-current={method === "magic" ? "page" : undefined}
          className={`rounded-md px-3 py-2 text-center text-sm ${
            method === "magic"
              ? "bg-accent text-accent-foreground"
              : "bg-surface ring-1 ring-border"
          }`}
        >
          Magic Link
        </Link>
        <Link
          href={loginHref("password")}
          aria-current={method === "password" ? "page" : undefined}
          className={`rounded-md px-3 py-2 text-center text-sm ${
            method === "password"
              ? "bg-accent text-accent-foreground"
              : "bg-surface ring-1 ring-border"
          }`}
        >
          Passwort
        </Link>
      </nav>

      {method === "magic" ? (
        <form className="flex flex-col gap-4" aria-describedby="login-disabled">
          <Field
            id="magic-email"
            label="E-Mail"
            hint="Ein Link würde später an diese E-Mail geschickt."
          >
            <Input
              id="magic-email"
              name="email"
              type="email"
              autoComplete="email"
              disabled
              placeholder="name@firma.de"
            />
          </Field>
          <Button type="submit" disabled>
            Link anfordern — nicht verbunden
          </Button>
        </form>
      ) : (
        <form className="flex flex-col gap-4" aria-describedby="login-disabled">
          <Field id="password-email" label="E-Mail">
            <Input
              id="password-email"
              name="email"
              type="email"
              autoComplete="email"
              disabled
              placeholder="name@firma.de"
            />
          </Field>
          <Field
            id="password"
            label="Passwort"
            hint="Kein separates Passwort-Konto außerhalb der Anmeldung."
          >
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              disabled
              placeholder="••••••••"
            />
          </Field>
          <Button type="submit" disabled>
            Anmelden — nicht verbunden
          </Button>
        </form>
      )}

      <p id="login-disabled" className="text-sm text-muted">
        Felder und Buttons sind absichtlich deaktiviert, bis die Anmeldung
        verdrahtet ist.
      </p>
    </Card>
  );
}
