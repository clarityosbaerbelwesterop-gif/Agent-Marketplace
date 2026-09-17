import { NextResponse } from "next/server";
import {
  getFailoverPresentation,
  getMemoryNetworkPresentation,
} from "@/lib/runtime/status";

export const dynamic = "force-dynamic";

/** Presentational router / memory-network flags. No secrets, no fake meter. */
export async function GET() {
  return NextResponse.json({
    failover: getFailoverPresentation(),
    memoryNetwork: getMemoryNetworkPresentation(),
  });
}
