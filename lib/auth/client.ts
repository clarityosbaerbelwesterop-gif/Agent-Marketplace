"use client";

import { createAuthClient } from "@neondatabase/auth/next";

/**
 * Browser Better Auth client. Talks to this app's `/api/auth/[...path]`
 * proxy (not a second auth system). Prefer server actions + `getVerifiedSession`
 * for anything that must be trusted.
 */
export const authClient = createAuthClient();
