"use server";

import { redirect } from "next/navigation";
import { getAuth, isNeonAuthConfigured } from "@/lib/auth/server";

export type AuthFormState = { error: string } | null;

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function requireAuthConfigured(): AuthFormState {
  if (!isNeonAuthConfigured()) {
    return {
      error:
        "Neon Auth is not configured on the server (NEON_AUTH_BASE_URL / NEON_AUTH_COOKIE_SECRET).",
    };
  }
  return null;
}

export async function signInWithEmail(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const configured = requireAuthConfigured();
  if (configured) {
    return configured;
  }

  const email = readString(formData, "email");
  const password = readString(formData, "password");
  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const { error } = await getAuth().signIn.email({ email, password });
  if (error) {
    return { error: error.message || "Failed to sign in." };
  }

  redirect("/marketplace");
}

export async function signUpWithEmail(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const configured = requireAuthConfigured();
  if (configured) {
    return configured;
  }

  const name = readString(formData, "name");
  const email = readString(formData, "email");
  const password = readString(formData, "password");
  if (!name || !email || !password) {
    return { error: "Name, email, and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const { error } = await getAuth().signUp.email({ name, email, password });
  if (error) {
    return { error: error.message || "Failed to create account." };
  }

  redirect("/marketplace");
}

export async function signInWithGoogle(
  state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  void state;
  void formData;
  const configured = requireAuthConfigured();
  if (configured) {
    return configured;
  }

  const { data, error } = await getAuth().signIn.social({
    provider: "google",
    callbackURL: "/marketplace",
  });

  if (error) {
    return { error: error.message || "Google sign-in failed." };
  }

  const url =
    data && typeof data === "object" && "url" in data
      ? String((data as { url?: string }).url ?? "")
      : "";

  if (!url) {
    return { error: "Google sign-in did not return a redirect URL." };
  }

  redirect(url);
}

export async function signOut(): Promise<void> {
  if (isNeonAuthConfigured()) {
    await getAuth().signOut();
  }
  redirect("/login");
}
