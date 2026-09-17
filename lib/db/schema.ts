import { relations, sql } from "drizzle-orm";
import {
  anonymousRole,
  authenticatedRole,
} from "drizzle-orm/neon";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  AgentConnectorSpec,
  AgentModelConfig,
  AgentPermissions,
  AgentRentalOptions,
  JsonObject,
  SkillCheckCriteria,
  SkillJsonSchema,
  SkillToolRequirements,
} from "./json";
import {
  authUserIdEq,
  crudPolicies,
  isRentalVisible,
  isSessionVisible,
  isWorkspaceMember,
  isWorkspaceOwner,
} from "./rls-sql";

/**
 * Marketplace tables in `public`. User id columns are uuid and match
 * `neon_auth.user.id`. Foreign keys to Neon Auth are declared in SQL
 * migrations only so Drizzle never CREATE/DROPs auth tables.
 */

export const agentTierEnum = pgEnum("agent_tier", [
  "standard",
  "advanced",
  "expert",
  "elite",
  "frontier",
]);

export const ratingStatusEnum = pgEnum("rating_status", [
  "untested",
  "baselined",
  "verified",
]);

export const agentAvailabilityEnum = pgEnum("agent_availability", [
  "available",
  "waitlist",
  "unavailable",
]);

export const workspaceMemberRoleEnum = pgEnum("workspace_member_role", [
  "owner",
  "admin",
  "member",
]);

export const rentalStatusEnum = pgEnum("rental_status", [
  "pending",
  "active",
  "expired",
  "canceled",
  "refunded",
]);

export const rentalPaymentKindEnum = pgEnum("rental_payment_kind", [
  "purchase",
  "renewal",
]);

export const rentalPaymentStatusEnum = pgEnum("rental_payment_status", [
  "open",
  "paid",
  "canceled",
]);

export const agentSessionStatusEnum = pgEnum("agent_session_status", [
  "open",
  "closed",
]);

export const agentRunStatusEnum = pgEnum("agent_run_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "canceled",
]);

export const memoryKindEnum = pgEnum("memory_kind", [
  "note",
  "transcript",
  "fact",
  "preference",
]);

export const connectorGrantStatusEnum = pgEnum("connector_grant_status", [
  "pending",
  "granted",
  "revoked",
  "expired",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: uuid("owner_user_id").notNull(),
    name: text("name").notNull(),
    ...timestamps,
  },
  (table) => [
    index("workspaces_owner_user_id_idx").on(table.ownerUserId),
    pgPolicy("workspaces_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUserIdEq(table.ownerUserId)} or ${isWorkspaceMember(table.id)}`,
    }),
    pgPolicy("workspaces_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: authUserIdEq(table.ownerUserId),
    }),
    pgPolicy("workspaces_update", {
      for: "update",
      to: authenticatedRole,
      using: authUserIdEq(table.ownerUserId),
      withCheck: authUserIdEq(table.ownerUserId),
    }),
    pgPolicy("workspaces_delete", {
      for: "delete",
      to: authenticatedRole,
      using: authUserIdEq(table.ownerUserId),
    }),
  ],
).enableRLS();

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    role: workspaceMemberRoleEnum("role").notNull().default("member"),
    ...timestamps,
  },
  (table) => [
    primaryKey({
      name: "workspace_members_pkey",
      columns: [table.workspaceId, table.userId],
    }),
    index("workspace_members_user_id_idx").on(table.userId),
    pgPolicy("workspace_members_select", {
      for: "select",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
    }),
    pgPolicy("workspace_members_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: isWorkspaceOwner(table.workspaceId),
    }),
    pgPolicy("workspace_members_update", {
      for: "update",
      to: authenticatedRole,
      using: isWorkspaceOwner(table.workspaceId),
      withCheck: isWorkspaceOwner(table.workspaceId),
    }),
    pgPolicy("workspace_members_delete", {
      for: "delete",
      to: authenticatedRole,
      using: isWorkspaceOwner(table.workspaceId),
    }),
  ],
).enableRLS();

export const agentProfiles = pgTable(
  "agent_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull().default("general"),
    specializations: text("specializations").array().notNull().default([]),
    languages: text("languages").array().notNull().default([]),
    tier: agentTierEnum("tier").notNull().default("standard"),
    avatarUrl: text("avatar_url"),
    accentColor: text("accent_color"),
    bannerUrl: text("banner_url"),
    tagline: text("tagline"),
    modelAlias: text("model_alias"),
    modelConfig: jsonb("model_config")
      .$type<AgentModelConfig>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    skillPackageVersion: text("skill_package_version"),
    connectors: jsonb("connectors")
      .$type<AgentConnectorSpec[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    permissions: jsonb("permissions")
      .$type<AgentPermissions>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    rentalOptions: jsonb("rental_options")
      .$type<AgentRentalOptions>()
      .notNull()
      .default(sql`'{"durations":[]}'::jsonb`),
    availability: agentAvailabilityEnum("availability")
      .notNull()
      .default("unavailable"),
    configVersion: integer("config_version").notNull().default(1),
    ratingStatus: ratingStatusEnum("rating_status")
      .notNull()
      .default("untested"),
    ...timestamps,
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("agent_profiles_category_idx").on(table.category),
    index("agent_profiles_tier_idx").on(table.tier),
    ...crudPolicies({
      role: anonymousRole,
      read: true,
      modify: false,
    }),
    ...crudPolicies({
      role: authenticatedRole,
      read: true,
      modify: false,
    }),
  ],
).enableRLS();

export const agentSkills = pgTable(
  "agent_skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentProfileId: uuid("agent_profile_id").references(
      () => agentProfiles.id,
      { onDelete: "set null" },
    ),
    slug: text("slug").notNull(),
    version: text("version").notNull(),
    instructions: text("instructions").notNull().default(""),
    inputs: jsonb("inputs")
      .$type<SkillJsonSchema>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    outputs: jsonb("outputs")
      .$type<SkillJsonSchema>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    toolRequirements: jsonb("tool_requirements")
      .$type<SkillToolRequirements>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    checkCriteria: jsonb("check_criteria")
      .$type<SkillCheckCriteria>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    published: boolean("published").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    unique("agent_skills_slug_version_uidx").on(table.slug, table.version),
    index("agent_skills_agent_profile_id_idx").on(table.agentProfileId),
    ...crudPolicies({
      role: anonymousRole,
      read: sql`${table.published} = true`,
      modify: false,
    }),
    ...crudPolicies({
      role: authenticatedRole,
      read: sql`${table.published} = true`,
      modify: false,
    }),
  ],
).enableRLS();

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id").notNull(),
    agentProfileId: uuid("agent_profile_id")
      .notNull()
      .references(() => agentProfiles.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    primaryKey({
      name: "favorites_pkey",
      columns: [table.userId, table.agentProfileId],
    }),
    index("favorites_agent_profile_id_idx").on(table.agentProfileId),
    ...crudPolicies({
      role: authenticatedRole,
      read: authUserIdEq(table.userId),
      modify: authUserIdEq(table.userId),
    }),
  ],
).enableRLS();

export const rentals = pgTable(
  "rentals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    agentProfileId: uuid("agent_profile_id")
      .notNull()
      .references(() => agentProfiles.id, { onDelete: "restrict" }),
    status: rentalStatusEnum("status").notNull().default("pending"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    stripeSessionId: text("stripe_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    usageIncluded: integer("usage_included").notNull().default(0),
    usageConsumed: integer("usage_consumed").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    unique("rentals_stripe_session_id_uidx").on(table.stripeSessionId),
    index("rentals_user_id_idx").on(table.userId),
    index("rentals_workspace_id_idx").on(table.workspaceId),
    index("rentals_agent_profile_id_idx").on(table.agentProfileId),
    index("rentals_status_idx").on(table.status),
    pgPolicy("rentals_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUserIdEq(table.userId)} or ${isWorkspaceMember(table.workspaceId)}`,
    }),
    pgPolicy("rentals_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUserIdEq(table.userId)} and ${isWorkspaceMember(table.workspaceId)}`,
    }),
    pgPolicy("rentals_update", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUserIdEq(table.userId)} or ${isWorkspaceOwner(table.workspaceId)}`,
      withCheck: sql`${authUserIdEq(table.userId)} or ${isWorkspaceOwner(table.workspaceId)}`,
    }),
    pgPolicy("rentals_delete", {
      for: "delete",
      to: authenticatedRole,
      using: authUserIdEq(table.userId),
    }),
  ],
).enableRLS();

/**
 * Stripe Checkout / PaymentIntent rows. Written by the billing path
 * (`getDb()` / privileged) so webhooks can apply without a user JWT.
 * No authenticated policies — FORCE RLS keeps end users out.
 */
export const rentalPayments = pgTable(
  "rental_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rentalId: uuid("rental_id")
      .notNull()
      .references(() => rentals.id, { onDelete: "cascade" }),
    kind: rentalPaymentKindEnum("kind").notNull(),
    status: rentalPaymentStatusEnum("status").notNull().default("open"),
    durationId: text("duration_id").notNull(),
    durationHours: integer("duration_hours").notNull(),
    usageIncluded: integer("usage_included").notNull().default(0),
    priceCents: integer("price_cents").notNull(),
    currency: text("currency").notNull().default("USD"),
    stripeSessionId: text("stripe_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    unique("rental_payments_stripe_session_id_uidx").on(table.stripeSessionId),
    unique("rental_payments_stripe_payment_intent_id_uidx").on(
      table.stripePaymentIntentId,
    ),
    index("rental_payments_rental_id_idx").on(table.rentalId),
    index("rental_payments_status_idx").on(table.status),
  ],
).enableRLS();

/**
 * Stripe event ids already processed. Unique primary key makes webhook
 * delivery retries a no-op.
 */
export const stripeEvents = pgTable(
  "stripe_events",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    rentalId: uuid("rental_id").references(() => rentals.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [index("stripe_events_rental_id_idx").on(table.rentalId)],
).enableRLS();

export const agentSessions = pgTable(
  "agent_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rentalId: uuid("rental_id")
      .notNull()
      .references(() => rentals.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    status: agentSessionStatusEnum("status").notNull().default("open"),
    openedAt: timestamp("opened_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (table) => [
    index("agent_sessions_rental_id_idx").on(table.rentalId),
    index("agent_sessions_workspace_id_idx").on(table.workspaceId),
    pgPolicy("agent_sessions_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${isRentalVisible(table.rentalId)} and ${isWorkspaceMember(table.workspaceId)}`,
    }),
    pgPolicy("agent_sessions_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${isRentalVisible(table.rentalId)} and ${isWorkspaceMember(table.workspaceId)}`,
    }),
    pgPolicy("agent_sessions_update", {
      for: "update",
      to: authenticatedRole,
      using: sql`${isRentalVisible(table.rentalId)} and ${isWorkspaceMember(table.workspaceId)}`,
      withCheck: sql`${isRentalVisible(table.rentalId)} and ${isWorkspaceMember(table.workspaceId)}`,
    }),
    pgPolicy("agent_sessions_delete", {
      for: "delete",
      to: authenticatedRole,
      using: isWorkspaceOwner(table.workspaceId),
    }),
  ],
).enableRLS();

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => agentSessions.id, { onDelete: "cascade" }),
    status: agentRunStatusEnum("status").notNull().default("queued"),
    modelIdUsed: text("model_id_used"),
    skillVersion: text("skill_version"),
    input: jsonb("input")
      .$type<JsonObject>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    output: jsonb("output").$type<JsonObject | null>(),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    totalTokens: integer("total_tokens"),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }),
    ...timestamps,
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    index("agent_runs_session_id_idx").on(table.sessionId),
    index("agent_runs_status_idx").on(table.status),
    pgPolicy("agent_runs_select", {
      for: "select",
      to: authenticatedRole,
      using: isSessionVisible(table.sessionId),
    }),
    pgPolicy("agent_runs_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: isSessionVisible(table.sessionId),
    }),
    pgPolicy("agent_runs_update", {
      for: "update",
      to: authenticatedRole,
      using: isSessionVisible(table.sessionId),
      withCheck: isSessionVisible(table.sessionId),
    }),
    pgPolicy("agent_runs_delete", {
      for: "delete",
      to: authenticatedRole,
      using: isSessionVisible(table.sessionId),
    }),
  ],
).enableRLS();

export const memories = pgTable(
  "memories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    sessionId: uuid("session_id").references(() => agentSessions.id, {
      onDelete: "set null",
    }),
    kind: memoryKindEnum("kind").notNull().default("note"),
    content: text("content").notNull(),
    ...timestamps,
  },
  (table) => [
    index("memories_workspace_user_idx").on(table.workspaceId, table.userId),
    index("memories_session_id_idx").on(table.sessionId),
    ...crudPolicies({
      role: authenticatedRole,
      read: sql`${authUserIdEq(table.userId)} and ${isWorkspaceMember(table.workspaceId)}`,
      modify: sql`${authUserIdEq(table.userId)} and ${isWorkspaceMember(table.workspaceId)}`,
    }),
  ],
).enableRLS();

export const connectorGrants = pgTable(
  "connector_grants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    provider: text("provider").notNull(),
    scopes: text("scopes").array().notNull().default([]),
    status: connectorGrantStatusEnum("status").notNull().default("pending"),
    ...timestamps,
  },
  (table) => [
    unique("connector_grants_workspace_user_provider_uidx").on(
      table.workspaceId,
      table.userId,
      table.provider,
    ),
    index("connector_grants_user_id_idx").on(table.userId),
    ...crudPolicies({
      role: authenticatedRole,
      read: sql`${authUserIdEq(table.userId)} and ${isWorkspaceMember(table.workspaceId)}`,
      modify: sql`${authUserIdEq(table.userId)} and ${isWorkspaceMember(table.workspaceId)}`,
    }),
  ],
).enableRLS();

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  rentals: many(rentals),
  sessions: many(agentSessions),
  memories: many(memories),
  connectorGrants: many(connectorGrants),
}));

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
  }),
);

export const agentProfilesRelations = relations(agentProfiles, ({ many }) => ({
  skills: many(agentSkills),
  favorites: many(favorites),
  rentals: many(rentals),
}));

export const agentSkillsRelations = relations(agentSkills, ({ one }) => ({
  agentProfile: one(agentProfiles, {
    fields: [agentSkills.agentProfileId],
    references: [agentProfiles.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  agentProfile: one(agentProfiles, {
    fields: [favorites.agentProfileId],
    references: [agentProfiles.id],
  }),
}));

export const rentalsRelations = relations(rentals, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [rentals.workspaceId],
    references: [workspaces.id],
  }),
  agentProfile: one(agentProfiles, {
    fields: [rentals.agentProfileId],
    references: [agentProfiles.id],
  }),
  sessions: many(agentSessions),
  payments: many(rentalPayments),
}));

export const rentalPaymentsRelations = relations(rentalPayments, ({ one }) => ({
  rental: one(rentals, {
    fields: [rentalPayments.rentalId],
    references: [rentals.id],
  }),
}));

export const stripeEventsRelations = relations(stripeEvents, ({ one }) => ({
  rental: one(rentals, {
    fields: [stripeEvents.rentalId],
    references: [rentals.id],
  }),
}));

export const agentSessionsRelations = relations(
  agentSessions,
  ({ one, many }) => ({
    rental: one(rentals, {
      fields: [agentSessions.rentalId],
      references: [rentals.id],
    }),
    workspace: one(workspaces, {
      fields: [agentSessions.workspaceId],
      references: [workspaces.id],
    }),
    runs: many(agentRuns),
    memories: many(memories),
  }),
);

export const agentRunsRelations = relations(agentRuns, ({ one }) => ({
  session: one(agentSessions, {
    fields: [agentRuns.sessionId],
    references: [agentSessions.id],
  }),
}));

export const memoriesRelations = relations(memories, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [memories.workspaceId],
    references: [workspaces.id],
  }),
  session: one(agentSessions, {
    fields: [memories.sessionId],
    references: [agentSessions.id],
  }),
}));

export const connectorGrantsRelations = relations(
  connectorGrants,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [connectorGrants.workspaceId],
      references: [workspaces.id],
    }),
  }),
);
