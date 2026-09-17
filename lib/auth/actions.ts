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
      error: "Anmeldung ist auf diesem Server nicht eingerichtet.",
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
    return { error: "E-Mail und Passwort sind erforderlich." };
  }

  const { error } = await getAuth().signIn.email({ email, password });
  if (error) {
    return { error: error.message || "Anmeldung fehlgeschlagen." };
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
    return { error: "Name, E-Mail und Passwort sind erforderlich." };
  }
  if (password.length < 8) {
    return { error: "Das Passwort muss mindestens 8 Zeichen haben." };
  }

  const { error } = await getAuth().signUp.email({ name, email, password });
  if (error) {
    return { error: error.message || "Konto konnte nicht angelegt werden." };
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
    return { error: error.message || "Google-Anmeldung fehlgeschlagen." };
  }

  const url =
    data && typeof data === "object" && "url" in data
      ? String((data as { url?: string }).url ?? "")
      : "";

  if (!url) {
    return { error: "Google-Anmeldung hat keine Weiterleitung geliefert." };
  }

  redirect(url);
}

export async function signOut(): Promise<void> {
  if (isNeonAuthConfigured()) {
    await getAuth().signOut();
  }
  redirect("/login");
}
