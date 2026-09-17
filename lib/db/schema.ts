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
  ConnectorCredentials,
  JsonObject,
  SkillCheckCriteria,
  SkillJsonSchema,
  SkillToolRequirements,
} from "./json";
import {
  authUserIdEq,
  crudPolicies,
  isAgentRoomOwner,
  isAgentRoomVisible,
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

export const agentSessionKindEnum = pgEnum("agent_session_kind", [
  "solo",
  "group",
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

export const memoryVisibilityEnum = pgEnum("memory_visibility", [
  "user",
  "workspace",
]);

export const skillLearningStatusEnum = pgEnum("skill_learning_status", [
  "queued",
  "publishing",
  "published",
  "skipped",
]);

export const networkNodeKindEnum = pgEnum("network_node_kind", [
  "fact",
  "skill",
  "preference",
  "summary",
]);

export const networkEdgeKindEnum = pgEnum("network_edge_kind", [
  "related",
  "derived_from",
  "supersedes",
]);

export const agentRoomStatusEnum = pgEnum("agent_room_status", [
  "open",
  "closed",
]);

export const agentRoomAuthorEnum = pgEnum("agent_room_author", [
  "user",
  "agent",
  "system",
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
    family: text("family"),
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
    index("agent_profiles_family_idx").on(table.family),
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
    endedAt: timestamp("ended_at", { withTimezone: true }),
    endedByUserId: uuid("ended_by_user_id"),
    endReason: text("end_reason"),
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
    kind: agentSessionKindEnum("kind").notNull().default("solo"),
    status: agentSessionStatusEnum("status").notNull().default("open"),
    openedAt: timestamp("opened_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (table) => [
    index("agent_sessions_rental_id_idx").on(table.rentalId),
    index("agent_sessions_rental_id_status_idx").on(
      table.rentalId,
      table.status,
    ),
    index("agent_sessions_workspace_id_idx").on(table.workspaceId),
    index("agent_sessions_kind_status_idx").on(table.kind, table.status),
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

/**
 * Group-chat membership. Solo sessions have a single host rental_id on
 * agent_sessions; group rooms also list every paid rental that may speak.
 * RLS follows session visibility (which includes member rentals).
 */
export const agentSessionMembers = pgTable(
  "agent_session_members",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => agentSessions.id, { onDelete: "cascade" }),
    rentalId: uuid("rental_id")
      .notNull()
      .references(() => rentals.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    primaryKey({
      name: "agent_session_members_pkey",
      columns: [table.sessionId, table.rentalId],
    }),
    index("agent_session_members_rental_id_idx").on(table.rentalId),
    pgPolicy("agent_session_members_select", {
      for: "select",
      to: authenticatedRole,
      using: isSessionVisible(table.sessionId),
    }),
    pgPolicy("agent_session_members_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${isSessionVisible(table.sessionId)} and ${isRentalVisible(table.rentalId)}`,
    }),
    pgPolicy("agent_session_members_update", {
      for: "update",
      to: authenticatedRole,
      using: isSessionVisible(table.sessionId),
      withCheck: sql`${isSessionVisible(table.sessionId)} and ${isRentalVisible(table.rentalId)}`,
    }),
    pgPolicy("agent_session_members_delete", {
      for: "delete",
      to: authenticatedRole,
      using: isSessionVisible(table.sessionId),
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
    providerUsed: text("provider_used"),
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
    index("agent_runs_session_id_status_idx").on(table.sessionId, table.status),
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
    visibility: memoryVisibilityEnum("visibility").notNull().default("user"),
    content: text("content").notNull(),
    ...timestamps,
  },
  (table) => [
    index("memories_workspace_user_idx").on(table.workspaceId, table.userId),
    index("memories_session_id_idx").on(table.sessionId),
    index("memories_workspace_visibility_created_idx").on(
      table.workspaceId,
      table.visibility,
      table.createdAt,
    ),
    pgPolicy("memories_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`(${authUserIdEq(table.userId)} or ${table.visibility} = 'workspace') and ${isWorkspaceMember(table.workspaceId)}`,
    }),
    pgPolicy("memories_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUserIdEq(table.userId)} and ${isWorkspaceMember(table.workspaceId)}`,
    }),
    pgPolicy("memories_update", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUserIdEq(table.userId)} and ${isWorkspaceMember(table.workspaceId)}`,
      withCheck: sql`${authUserIdEq(table.userId)} and ${isWorkspaceMember(table.workspaceId)}`,
    }),
    pgPolicy("memories_delete", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUserIdEq(table.userId)} and ${isWorkspaceMember(table.workspaceId)}`,
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
    metadata: jsonb("metadata")
      .$type<JsonObject>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    credentials: jsonb("credentials").$type<ConnectorCredentials | null>(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
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

export const skillLearningEvents = pgTable(
  "skill_learning_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    sourceSessionId: uuid("source_session_id").references(() => agentSessions.id, {
      onDelete: "set null",
    }),
    sourceRentalId: uuid("source_rental_id").references(() => rentals.id, {
      onDelete: "set null",
    }),
    agentProfileId: uuid("agent_profile_id").references(() => agentProfiles.id, {
      onDelete: "set null",
    }),
    publisherTier: agentTierEnum("publisher_tier").notNull().default("standard"),
    status: skillLearningStatusEnum("status").notNull().default("queued"),
    summary: text("summary").notNull(),
    verified: boolean("verified").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("skill_learning_events_workspace_status_idx").on(
      table.workspaceId,
      table.status,
      table.createdAt,
    ),
    ...crudPolicies({
      role: authenticatedRole,
      read: sql`${isWorkspaceMember(table.workspaceId)}`,
      modify: sql`${authUserIdEq(table.userId)} and ${isWorkspaceMember(table.workspaceId)}`,
    }),
  ],
).enableRLS();

export const networkNodes = pgTable(
  "network_nodes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    kind: networkNodeKindEnum("kind").notNull().default("summary"),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    sourceEventId: uuid("source_event_id").references(
      () => skillLearningEvents.id,
      { onDelete: "set null" },
    ),
    publisherTier: agentTierEnum("publisher_tier").notNull().default("standard"),
    verified: boolean("verified").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    unique("network_nodes_workspace_kind_title_uidx").on(
      table.workspaceId,
      table.kind,
      table.title,
    ),
    index("network_nodes_workspace_id_idx").on(table.workspaceId),
    ...crudPolicies({
      role: authenticatedRole,
      read: sql`${isWorkspaceMember(table.workspaceId)}`,
      modify: sql`${authUserIdEq(table.userId)} and ${isWorkspaceMember(table.workspaceId)}`,
    }),
  ],
).enableRLS();

export const networkEdges = pgTable(
  "network_edges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    fromNodeId: uuid("from_node_id")
      .notNull()
      .references(() => networkNodes.id, { onDelete: "cascade" }),
    toNodeId: uuid("to_node_id")
      .notNull()
      .references(() => networkNodes.id, { onDelete: "cascade" }),
    kind: networkEdgeKindEnum("kind").notNull().default("related"),
    ...timestamps,
  },
  (table) => [
    unique("network_edges_from_to_kind_uidx").on(
      table.fromNodeId,
      table.toNodeId,
      table.kind,
    ),
    index("network_edges_workspace_id_idx").on(table.workspaceId),
    ...crudPolicies({
      role: authenticatedRole,
      read: sql`${isWorkspaceMember(table.workspaceId)}`,
      modify: sql`${isWorkspaceMember(table.workspaceId)}`,
    }),
  ],
).enableRLS();

export const agentRooms = pgTable(
  "agent_rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    ownerUserId: uuid("owner_user_id").notNull(),
    title: text("title").notNull(),
    status: agentRoomStatusEnum("status").notNull().default("open"),
    ...timestamps,
  },
  (table) => [
    index("agent_rooms_owner_user_id_idx").on(table.ownerUserId),
    index("agent_rooms_workspace_id_idx").on(table.workspaceId),
    pgPolicy("agent_rooms_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUserIdEq(table.ownerUserId)} or ${isWorkspaceMember(table.workspaceId)}`,
    }),
    pgPolicy("agent_rooms_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUserIdEq(table.ownerUserId)} and ${isWorkspaceMember(table.workspaceId)}`,
    }),
    pgPolicy("agent_rooms_update", {
      for: "update",
      to: authenticatedRole,
      using: authUserIdEq(table.ownerUserId),
      withCheck: authUserIdEq(table.ownerUserId),
    }),
    pgPolicy("agent_rooms_delete", {
      for: "delete",
      to: authenticatedRole,
      using: authUserIdEq(table.ownerUserId),
    }),
  ],
).enableRLS();

export const agentRoomMembers = pgTable(
  "agent_room_members",
  {
    roomId: uuid("room_id")
      .notNull()
      .references(() => agentRooms.id, { onDelete: "cascade" }),
    rentalId: uuid("rental_id")
      .notNull()
      .references(() => rentals.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => agentSessions.id, {
      onDelete: "set null",
    }),
    agentProfileId: uuid("agent_profile_id")
      .notNull()
      .references(() => agentProfiles.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    primaryKey({
      name: "agent_room_members_pkey",
      columns: [table.roomId, table.rentalId],
    }),
    index("agent_room_members_rental_id_idx").on(table.rentalId),
    pgPolicy("agent_room_members_select", {
      for: "select",
      to: authenticatedRole,
      using: isAgentRoomVisible(table.roomId),
    }),
    pgPolicy("agent_room_members_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: isAgentRoomOwner(table.roomId),
    }),
    pgPolicy("agent_room_members_update", {
      for: "update",
      to: authenticatedRole,
      using: isAgentRoomOwner(table.roomId),
      withCheck: isAgentRoomOwner(table.roomId),
    }),
    pgPolicy("agent_room_members_delete", {
      for: "delete",
      to: authenticatedRole,
      using: isAgentRoomOwner(table.roomId),
    }),
  ],
).enableRLS();

export const agentRoomMessages = pgTable(
  "agent_room_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => agentRooms.id, { onDelete: "cascade" }),
    authorKind: agentRoomAuthorEnum("author_kind").notNull(),
    rentalId: uuid("rental_id").references(() => rentals.id, {
      onDelete: "set null",
    }),
    runId: uuid("run_id").references(() => agentRuns.id, {
      onDelete: "set null",
    }),
    content: text("content").notNull(),
    status: text("status").notNull().default("complete"),
    ...timestamps,
  },
  (table) => [
    index("agent_room_messages_room_id_idx").on(table.roomId, table.createdAt),
    pgPolicy("agent_room_messages_select", {
      for: "select",
      to: authenticatedRole,
      using: isAgentRoomVisible(table.roomId),
    }),
    pgPolicy("agent_room_messages_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: isAgentRoomVisible(table.roomId),
    }),
    pgPolicy("agent_room_messages_update", {
      for: "update",
      to: authenticatedRole,
      using: isAgentRoomVisible(table.roomId),
      withCheck: isAgentRoomVisible(table.roomId),
    }),
    pgPolicy("agent_room_messages_delete", {
      for: "delete",
      to: authenticatedRole,
      using: isAgentRoomOwner(table.roomId),
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
  sessionMemberships: many(agentSessionMembers),
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
    members: many(agentSessionMembers),
  }),
);

export const agentSessionMembersRelations = relations(
  agentSessionMembers,
  ({ one }) => ({
    session: one(agentSessions, {
      fields: [agentSessionMembers.sessionId],
      references: [agentSessions.id],
    }),
    rental: one(rentals, {
      fields: [agentSessionMembers.rentalId],
      references: [rentals.id],
    }),
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
