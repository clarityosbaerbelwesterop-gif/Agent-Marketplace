import type { Metadata } from "next";
import { LoginForms } from "@/components/login-forms";
import { PageShell } from "@/components/page-shell";
import { signOut } from "@/lib/auth/actions";
import { getVerifiedSession, isNeonAuthConfigured } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Login",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const configured = isNeonAuthConfigured();
  const session = await getVerifiedSession();

  if (session?.user) {
    return (
      <PageShell
        title="Account"
        description="Session is verified on the server against Neon Auth (Managed Better Auth)."
      >
        <dl className="grid max-w-md gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Name</dt>
            <dd>{session.user.name || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Email</dt>
            <dd>{session.user.email || "—"}</dd>
          </div>
        </dl>
        <form action={signOut}>
          <button
            className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-border/40"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Login"
      description={
        configured
          ? "Sign in or create an account with Neon Auth. Sessions are verified on the server."
          : "Neon Auth env vars are missing on this server, so sign-in cannot run yet."
      }
    >
      {configured ? (
        <LoginForms />
      ) : (
        <p className="text-sm text-muted">
          Set <code className="font-mono">NEON_AUTH_BASE_URL</code> and{" "}
          <code className="font-mono">NEON_AUTH_COOKIE_SECRET</code>.
        </p>
      )}
    </PageShell>
  );
}
