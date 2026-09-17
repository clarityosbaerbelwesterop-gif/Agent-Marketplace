import { NextResponse } from "next/server";
import { jsonError, requireApiUser } from "@/lib/api/guard";
import { connectorsForContext, loadRuntimeContext } from "@/lib/runtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }
  const url = new URL(request.url);
  const rentalId = url.searchParams.get("rentalId")?.trim();
  const sessionId = url.searchParams.get("sessionId")?.trim();
  if (!rentalId && !sessionId) {
    return jsonError("rentalId or sessionId is required", 400);
  }
  const context = await loadRuntimeContext({
    userId: auth.userId,
    rentalId: rentalId || undefined,
    sessionId: sessionId || undefined,
  });
  if (!context.ok) {
    return jsonError(context.error, context.status);
  }
  const items = await connectorsForContext(context.data);
  return NextResponse.json({
    rentalId: context.data.rental.id,
    workspaceId: context.data.rental.workspaceId,
    oauth: "not_wired",
    items,
  });
}
