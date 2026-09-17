-- Workspace-scoped shared agent network (not cross-tenant).
-- Memory visibility stays user|workspace from 0006. Mesh rows live in
-- skill_learning_events / network_nodes / network_edges. Concurrent agents
-- use SKIP LOCKED + advisory try-lock (no blocking deadlock).

CREATE TYPE "public"."skill_learning_status" AS ENUM('queued', 'publishing', 'published', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."network_node_kind" AS ENUM('fact', 'skill', 'preference', 'summary');--> statement-breakpoint
CREATE TYPE "public"."network_edge_kind" AS ENUM('related', 'derived_from', 'supersedes');--> statement-breakpoint

CREATE TABLE "skill_learning_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "source_session_id" uuid,
  "source_rental_id" uuid,
  "agent_profile_id" uuid,
  "publisher_tier" "agent_tier" DEFAULT 'standard' NOT NULL,
  "status" "skill_learning_status" DEFAULT 'queued' NOT NULL,
  "summary" text NOT NULL,
  "verified" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "skill_learning_events" ADD CONSTRAINT "skill_learning_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_learning_events" ADD CONSTRAINT "skill_learning_events_source_session_id_agent_sessions_id_fk" FOREIGN KEY ("source_session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_learning_events" ADD CONSTRAINT "skill_learning_events_source_rental_id_rentals_id_fk" FOREIGN KEY ("source_rental_id") REFERENCES "public"."rentals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_learning_events" ADD CONSTRAINT "skill_learning_events_agent_profile_id_agent_profiles_id_fk" FOREIGN KEY ("agent_profile_id") REFERENCES "public"."agent_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "skill_learning_events_workspace_status_idx" ON "skill_learning_events" USING btree ("workspace_id","status","created_at");--> statement-breakpoint
ALTER TABLE "skill_learning_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "skill_learning_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "skill_learning_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_workspace_member("skill_learning_events"."workspace_id")));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "skill_learning_events" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "skill_learning_events"."user_id"::text) and (select public.is_workspace_member("skill_learning_events"."workspace_id")));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "skill_learning_events" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "skill_learning_events"."user_id"::text) and (select public.is_workspace_member("skill_learning_events"."workspace_id"))) WITH CHECK ((select auth.user_id() = "skill_learning_events"."user_id"::text) and (select public.is_workspace_member("skill_learning_events"."workspace_id")));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "skill_learning_events" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "skill_learning_events"."user_id"::text) and (select public.is_workspace_member("skill_learning_events"."workspace_id")));--> statement-breakpoint

CREATE TABLE "network_nodes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "kind" "network_node_kind" DEFAULT 'summary' NOT NULL,
  "title" text NOT NULL,
  "summary" text NOT NULL,
  "source_event_id" uuid,
  "publisher_tier" "agent_tier" DEFAULT 'standard' NOT NULL,
  "verified" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "network_nodes" ADD CONSTRAINT "network_nodes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_nodes" ADD CONSTRAINT "network_nodes_source_event_id_skill_learning_events_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."skill_learning_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_nodes" ADD CONSTRAINT "network_nodes_workspace_kind_title_uidx" UNIQUE ("workspace_id","kind","title");--> statement-breakpoint
CREATE INDEX "network_nodes_workspace_id_idx" ON "network_nodes" USING btree ("workspace_id");--> statement-breakpoint
ALTER TABLE "network_nodes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "network_nodes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "network_nodes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_workspace_member("network_nodes"."workspace_id")));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "network_nodes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "network_nodes"."user_id"::text) and (select public.is_workspace_member("network_nodes"."workspace_id")));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "network_nodes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "network_nodes"."user_id"::text) and (select public.is_workspace_member("network_nodes"."workspace_id"))) WITH CHECK ((select auth.user_id() = "network_nodes"."user_id"::text) and (select public.is_workspace_member("network_nodes"."workspace_id")));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "network_nodes" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "network_nodes"."user_id"::text) and (select public.is_workspace_member("network_nodes"."workspace_id")));--> statement-breakpoint

CREATE TABLE "network_edges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "from_node_id" uuid NOT NULL,
  "to_node_id" uuid NOT NULL,
  "kind" "network_edge_kind" DEFAULT 'related' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "network_edges" ADD CONSTRAINT "network_edges_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_edges" ADD CONSTRAINT "network_edges_from_node_id_network_nodes_id_fk" FOREIGN KEY ("from_node_id") REFERENCES "public"."network_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_edges" ADD CONSTRAINT "network_edges_to_node_id_network_nodes_id_fk" FOREIGN KEY ("to_node_id") REFERENCES "public"."network_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_edges" ADD CONSTRAINT "network_edges_from_to_kind_uidx" UNIQUE ("from_node_id","to_node_id","kind");--> statement-breakpoint
CREATE INDEX "network_edges_workspace_id_idx" ON "network_edges" USING btree ("workspace_id");--> statement-breakpoint
ALTER TABLE "network_edges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "network_edges" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "network_edges" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_workspace_member("network_edges"."workspace_id")));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "network_edges" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select public.is_workspace_member("network_edges"."workspace_id")));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "network_edges" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select public.is_workspace_member("network_edges"."workspace_id"))) WITH CHECK ((select public.is_workspace_member("network_edges"."workspace_id")));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "network_edges" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select public.is_workspace_member("network_edges"."workspace_id")));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.skill_learning_events,
  public.network_nodes,
  public.network_edges
TO authenticated;
