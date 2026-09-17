import { NextResponse, type NextRequest } from "next/server";
import { getAuth, isNeonAuthConfigured } from "@/lib/auth/server";

/**
 * Next.js 16 request proxy. Marketplace catalog routes stay public.
 * Future account pages can be added to `matcher` to require a session.
 */
export default async function proxy(request: NextRequest) {
  if (!isNeonAuthConfigured()) {
    return NextResponse.next();
  }

  return getAuth().middleware({ loginUrl: "/login" })(request);
}

export const config = {
  matcher: ["/account/:path*"],
};
