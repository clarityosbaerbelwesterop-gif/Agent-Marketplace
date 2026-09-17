import { sql, type SQL } from "drizzle-orm";
import { crudPolicy } from "drizzle-orm/neon";
import {
  type AnyPgColumn,
  type PgPolicy,
} from "drizzle-orm/pg-core";

/**
 * Neon Auth / Data API compatible check: JWT `sub` equals a uuid column.
 * `auth.user_id()` returns text (Better Auth `sub`); columns stay uuid to
 * match `neon_auth.user.id`.
 */
export function authUserIdEq(column: AnyPgColumn): SQL {
  return sql`(select auth.user_id() = ${column}::text)`;
}

export function isWorkspaceMember(workspaceIdColumn: AnyPgColumn): SQL {
  return sql`(select public.is_workspace_member(${workspaceIdColumn}))`;
}

export function isWorkspaceOwner(workspaceIdColumn: AnyPgColumn): SQL {
  return sql`(select public.is_workspace_owner(${workspaceIdColumn}))`;
}

export function isSessionVisible(sessionIdColumn: AnyPgColumn): SQL {
  return sql`(select public.is_session_visible(${sessionIdColumn}))`;
}

export function isRentalVisible(rentalIdColumn: AnyPgColumn): SQL {
  return sql`(select public.is_rental_visible(${rentalIdColumn}))`;
}

/** Typed wrapper so spreading policies does not collapse pgTable overloads. */
export function crudPolicies(
  options: Parameters<typeof crudPolicy>[0],
): PgPolicy[] {
  return crudPolicy(options).filter((policy): policy is PgPolicy =>
    Boolean(policy),
  );
}
