"use client";

import { useActionState } from "react";
import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  type AuthFormState,
} from "@/lib/auth/actions";

const fieldClass =
  "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";
const labelClass = "text-sm font-medium";
const buttonClass =
  "rounded-md border border-foreground bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-60";
const ghostButtonClass =
  "rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-border/40";

function ErrorText({ error }: { error?: string }) {
  if (!error) {
    return null;
  }
  return (
    <p className="text-sm text-red-700" role="alert">
      {error}
    </p>
  );
}

export function LoginForms() {
  const [signInState, signInAction, signInPending] = useActionState(
    signInWithEmail,
    null as AuthFormState,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUpWithEmail,
    null as AuthFormState,
  );
  const [googleState, googleAction, googlePending] = useActionState(
    signInWithGoogle,
    null as AuthFormState,
  );

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <form action={signInAction} className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Sign in</h2>
        <label className={labelClass}>
          Email
          <input
            className={fieldClass}
            type="email"
            name="email"
            autoComplete="email"
            required
          />
        </label>
        <label className={labelClass}>
          Password
          <input
            className={fieldClass}
            type="password"
            name="password"
            autoComplete="current-password"
            required
            minLength={8}
          />
        </label>
        <ErrorText error={signInState?.error} />
        <button className={buttonClass} type="submit" disabled={signInPending}>
          {signInPending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <form action={signUpAction} className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Create account</h2>
        <label className={labelClass}>
          Name
          <input
            className={fieldClass}
            type="text"
            name="name"
            autoComplete="name"
            required
          />
        </label>
        <label className={labelClass}>
          Email
          <input
            className={fieldClass}
            type="email"
            name="email"
            autoComplete="email"
            required
          />
        </label>
        <label className={labelClass}>
          Password
          <input
            className={fieldClass}
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </label>
        <ErrorText error={signUpState?.error} />
        <button className={buttonClass} type="submit" disabled={signUpPending}>
          {signUpPending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <form action={googleAction} className="md:col-span-2">
        <ErrorText error={googleState?.error} />
        <button
          className={ghostButtonClass}
          type="submit"
          disabled={googlePending}
        >
          {googlePending ? "Redirecting…" : "Continue with Google"}
        </button>
      </form>
    </div>
  );
}
