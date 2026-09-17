import { NextResponse } from "next/server";
import { searchDiscoveredConnectors } from "@/lib/connectors/discovery";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q");
  const result = await searchDiscoveredConnectors(query);
  return NextResponse.json(result);
}
