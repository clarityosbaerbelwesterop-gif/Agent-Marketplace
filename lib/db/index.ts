export { getDb, getSql, type Database } from "./client";
export { withJwtClaims, withUserRls, type JwtClaims } from "./rls";
export * from "./json";
export * from "./schema";

import type {
  agentProfiles,
  agentRuns,
  agentSessions,
  agentSkills,
  connectorGrants,
  favorites,
  memories,
  rentalPayments,
  rentals,
  stripeEvents,
  workspaceMembers,
  workspaces,
} from "./schema";

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;

export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;

export type AgentProfile = typeof agentProfiles.$inferSelect;
export type NewAgentProfile = typeof agentProfiles.$inferInsert;

export type AgentSkill = typeof agentSkills.$inferSelect;
export type NewAgentSkill = typeof agentSkills.$inferInsert;

export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;

export type Rental = typeof rentals.$inferSelect;
export type NewRental = typeof rentals.$inferInsert;

export type RentalPayment = typeof rentalPayments.$inferSelect;
export type NewRentalPayment = typeof rentalPayments.$inferInsert;

export type StripeEventRow = typeof stripeEvents.$inferSelect;

export type AgentSession = typeof agentSessions.$inferSelect;
export type NewAgentSession = typeof agentSessions.$inferInsert;

export type AgentRun = typeof agentRuns.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;

export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;

export type ConnectorGrant = typeof connectorGrants.$inferSelect;
export type NewConnectorGrant = typeof connectorGrants.$inferInsert;
