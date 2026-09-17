import { NextResponse } from "next/server";
import { getVerifiedUserId } from "@/lib/auth/server";
import { addFavorite, listFavorites } from "@/lib/catalog/favorites";
import { isDatabaseConfigured } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getVerifiedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  const items = await listFavorites(userId);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const userId = await getVerifiedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug =
    body && typeof body === "object" && "slug" in body
      ? String((body as { slug?: unknown }).slug ?? "")
      : "";

  const result = await addFavorite(userId, slug);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
