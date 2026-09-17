import { NextResponse } from "next/server";
import {
  compareAgents,
  isDatabaseConfigured,
  parseCompareSlugs,
} from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const parsed = parseCompareSlugs(new URL(request.url).searchParams);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  const result = await compareAgents(parsed.slugs);
  return NextResponse.json(result);
}
