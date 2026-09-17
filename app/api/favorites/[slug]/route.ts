import { NextResponse } from "next/server";
import { getVerifiedUserId } from "@/lib/auth/server";
import { removeFavorite } from "@/lib/catalog/favorites";
import { isDatabaseConfigured } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
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

  const { slug } = await context.params;
  const result = await removeFavorite(userId, slug);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
