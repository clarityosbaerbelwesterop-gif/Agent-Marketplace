/**
 * TODO: Replace with the Neon Auth (Managed Better Auth) session shape.
 * Do not introduce a second auth library.
 */
export type AuthUser = {
  id: string;
  email: string;
  displayName?: string;
};

export type AuthSession = {
  user: AuthUser | null;
};
