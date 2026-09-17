import { NextResponse } from "next/server";
import { isDatabaseConfigured, listAgents } from "@/lib/catalog/queries";
import { parseAgentsQuery } from "@/lib/catalog/parse-query";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  const parsed = parseAgentsQuery(new URL(request.url).searchParams);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const result = await listAgents(parsed);
  return NextResponse.json(result);
}
