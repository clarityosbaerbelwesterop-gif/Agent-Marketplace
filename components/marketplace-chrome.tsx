"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function MarketplaceChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/studio" || pathname.startsWith("/studio/")) {
    return null;
  }
  return children;
}
