import { NextResponse } from "next/server";
import { getVerifiedUserId } from "@/lib/auth/server";
import { isDatabaseConfigured } from "@/lib/catalog/queries";

export type ApiUser = { userId: string };

export async function requireApiUser(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const userId = await getVerifiedUserId();
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "DATABASE_URL is not configured" },
        { status: 503 },
      ),
    };
  }
  return { ok: true, userId };
}

export async function readJsonBody(request: Request): Promise<
  { ok: true; body: unknown } | { ok: false; response: NextResponse }
> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }),
    };
  }
}

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}
