import { NextResponse } from "next/server";
import { jsonError, readJsonBody, requireApiUser } from "@/lib/api/guard";
import { createRentalCheckout, listRentals } from "@/lib/runtime/rentals";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }
  const items = await listRentals(auth.userId);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }
  const json = await readJsonBody(request);
  if (!json.ok) {
    return json.response;
  }
  const body = json.body;
  if (!body || typeof body !== "object") {
    return jsonError("Invalid JSON", 400);
  }
  const payload = body as { slug?: unknown; durationId?: unknown };
  const result = await createRentalCheckout({
    userId: auth.userId,
    slug: String(payload.slug ?? ""),
    durationId:
      typeof payload.durationId === "string" ? payload.durationId : undefined,
  });
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }
  return NextResponse.json(result.data, { status: 201 });
}
