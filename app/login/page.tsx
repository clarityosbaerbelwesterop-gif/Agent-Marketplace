import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <PageShell
      title="Login"
      description="Auth is not configured. Use Neon Auth when this is implemented — do not add a second auth system or a working mock sign-in."
    />
  );
}
