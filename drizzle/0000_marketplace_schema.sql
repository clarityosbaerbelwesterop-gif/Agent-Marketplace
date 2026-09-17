-- Agent Marketplace schema.
-- Does not create or alter Neon Auth tables in schema neon_auth.
-- Privileged role (neondb_owner) has BYPASSRLS and is used for migrations.
-- App queries that must honor RLS: SET LOCAL ROLE authenticated and
-- set_config('request.jwt.claims', '{"sub":"<neon_auth.user.id>"}', true).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN
    CREATE ROLE anonymous NOLOGIN NOINHERIT;
  END IF;
END
$$;
--> statement-breakpoint
GRANT authenticated TO CURRENT_USER;
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS auth;
--> statement-breakpoint
COMMENT ON SCHEMA auth IS 'Session helpers compatible with Neon Auth / Better Auth JWTs and the Data API.';
--> statement-breakpoint
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS text
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    NULLIF(
      (NULLIF(current_setting('request.jwt.claims', true), ''))::jsonb ->> 'sub',
      ''
    )
  );
$$;
--> statement-breakpoint
COMMENT ON FUNCTION auth.user_id() IS
  'Authenticated Neon Auth user id (JWT sub). Reads request.jwt.claims or request.jwt.claim.sub.';
--> statement-breakpoint
REVOKE ALL ON FUNCTION auth.user_id() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION auth.user_id() TO authenticated, anonymous;
--> statement-breakpoint
GRANT USAGE ON SCHEMA auth TO authenticated, anonymous;
--> statement-breakpoint
CREATE TYPE "public"."agent_availability" AS ENUM('available', 'waitlist', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."agent_run_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."agent_session_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."agent_tier" AS ENUM('standard', 'advanced', 'expert', 'elite', 'frontier');--> statement-breakpoint
CREATE TYPE "public"."connector_grant_status" AS ENUM('pending', 'granted', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."memory_kind" AS ENUM('note', 'transcript', 'fact', 'preference');--> statement-breakpoint
CREATE TYPE "public"."rating_status" AS ENUM('untested', 'baselined', 'verified');--> statement-breakpoint
CREATE TYPE "public"."rental_status" AS ENUM('pending', 'active', 'expired', 'canceled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."workspace_member_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TABLE "agent_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"specializations" text[] DEFAULT '{}' NOT NULL,
	"languages" text[] DEFAULT '{}' NOT NULL,
	"tier" "agent_tier" DEFAULT 'standard' NOT NULL,
	"avatar_url" text,
	"accent_color" text,
	"banner_url" text,
	"tagline" text,
	"model_alias" text,
	"model_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"skill_package_version" text,
	"connectors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rental_options" jsonb DEFAULT '{"durations":[]}'::jsonb NOT NULL,
	"availability" "agent_availability" DEFAULT 'unavailable' NOT NULL,
	"config_version" integer DEFAULT 1 NOT NULL,
	"rating_status" "rating_status" DEFAULT 'untested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_profiles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "agent_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"status" "agent_run_status" DEFAULT 'queued' NOT NULL,
	"model_id_used" text,
	"skill_version" text,
	"input" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"output" jsonb,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer,
	"cost_usd" numeric(12, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "agent_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rental_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"status" "agent_session_status" DEFAULT 'open' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "agent_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "agent_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_profile_id" uuid,
	"slug" text NOT NULL,
	"version" text NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"inputs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"outputs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tool_requirements" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"check_criteria" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_skills_slug_version_uidx" UNIQUE("slug","version")
);
--> statement-breakpoint
ALTER TABLE "agent_skills" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "connector_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"scopes" text[] DEFAULT '{}' NOT NULL,
	"status" "connector_grant_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connector_grants_workspace_user_provider_uidx" UNIQUE("workspace_id","user_id","provider")
);
--> statement-breakpoint
ALTER TABLE "connector_grants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" uuid NOT NULL,
	"agent_profile_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_pkey" PRIMARY KEY("user_id","agent_profile_id")
);
--> statement-breakpoint
ALTER TABLE "favorites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid,
	"kind" "memory_kind" DEFAULT 'note' NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rentals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"agent_profile_id" uuid NOT NULL,
	"status" "rental_status" DEFAULT 'pending' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"usage_included" integer DEFAULT 0 NOT NULL,
	"usage_consumed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rentals_stripe_session_id_uidx" UNIQUE("stripe_session_id")
);
--> statement-breakpoint
ALTER TABLE "rentals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "workspace_member_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_pkey" PRIMARY KEY("workspace_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "workspace_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_rental_id_rentals_id_fk" FOREIGN KEY ("rental_id") REFERENCES "public"."rentals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_skills" ADD CONSTRAINT "agent_skills_agent_profile_id_agent_profiles_id_fk" FOREIGN KEY ("agent_profile_id") REFERENCES "public"."agent_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connector_grants" ADD CONSTRAINT "connector_grants_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_agent_profile_id_agent_profiles_id_fk" FOREIGN KEY ("agent_profile_id") REFERENCES "public"."agent_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_agent_profile_id_agent_profiles_id_fk" FOREIGN KEY ("agent_profile_id") REFERENCES "public"."agent_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_profiles_category_idx" ON "agent_profiles" USING btree ("category");--> statement-breakpoint
CREATE INDEX "agent_profiles_tier_idx" ON "agent_profiles" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "agent_runs_session_id_idx" ON "agent_runs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "agent_runs_status_idx" ON "agent_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_sessions_rental_id_idx" ON "agent_sessions" USING btree ("rental_id");--> statement-breakpoint
CREATE INDEX "agent_sessions_workspace_id_idx" ON "agent_sessions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "agent_skills_agent_profile_id_idx" ON "agent_skills" USING btree ("agent_profile_id");--> statement-breakpoint
CREATE INDEX "connector_grants_user_id_idx" ON "connector_grants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "favorites_agent_profile_id_idx" ON "favorites" USING btree ("agent_profile_id");--> statement-breakpoint
CREATE INDEX "memories_workspace_user_idx" ON "memories" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "memories_session_id_idx" ON "memories" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "rentals_user_id_idx" ON "rentals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rentals_workspace_id_idx" ON "rentals" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "rentals_agent_profile_id_idx" ON "rentals" USING btree ("agent_profile_id");--> statement-breakpoint
CREATE INDEX "rentals_status_idx" ON "rentals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workspaces_owner_user_id_idx" ON "workspaces" USING btree ("owner_user_id");--> statement-breakpoint
ALTER TABLE "workspaces"
  ADD CONSTRAINT "workspaces_owner_user_id_neon_auth_user_fk"
  FOREIGN KEY ("owner_user_id") REFERENCES neon_auth."user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "workspace_members"
  ADD CONSTRAINT "workspace_members_user_id_neon_auth_user_fk"
  FOREIGN KEY ("user_id") REFERENCES neon_auth."user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "favorites"
  ADD CONSTRAINT "favorites_user_id_neon_auth_user_fk"
  FOREIGN KEY ("user_id") REFERENCES neon_auth."user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "rentals"
  ADD CONSTRAINT "rentals_user_id_neon_auth_user_fk"
  FOREIGN KEY ("user_id") REFERENCES neon_auth."user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "memories"
  ADD CONSTRAINT "memories_user_id_neon_auth_user_fk"
  FOREIGN KEY ("user_id") REFERENCES neon_auth."user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "connector_grants"
  ADD CONSTRAINT "connector_grants_user_id_neon_auth_user_fk"
  FOREIGN KEY ("user_id") REFERENCES neon_auth."user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members m
    WHERE m.workspace_id = p_workspace_id
      AND m.user_id::text = auth.user_id()
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.is_workspace_owner(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = p_workspace_id
      AND w.owner_user_id::text = auth.user_id()
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.is_rental_visible(p_rental_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rentals r
    WHERE r.id = p_rental_id
      AND (
        r.user_id::text = auth.user_id()
        OR public.is_workspace_member(r.workspace_id)
      )
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.is_session_visible(p_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agent_sessions s
    WHERE s.id = p_session_id
      AND public.is_workspace_member(s.workspace_id)
      AND public.is_rental_visible(s.rental_id)
  );
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.is_workspace_member(uuid) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.is_workspace_owner(uuid) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.is_rental_visible(uuid) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.is_session_visible(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_workspace_owner(uuid) TO authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_rental_visible(uuid) TO authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_session_visible(uuid) TO authenticated;
--> statement-breakpoint
CREATE POLICY "crud-anonymous-policy-select" ON "agent_profiles" AS PERMISSIVE FOR SELECT TO "anonymous" USING (true);--> statement-breakpoint
CREATE POLICY "crud-anonymous-policy-insert" ON "agent_profiles" AS PERMISSIVE FOR INSERT TO "anonymous" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-anonymous-policy-update" ON "agent_profiles" AS PERMISSIVE FOR UPDATE TO "anonymous" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-anonymous-policy-delete" ON "agent_profiles" AS PERMISSIVE FOR DELETE TO "anonymous" USING (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "agent_profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "agent_profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "agent_profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "agent_profiles" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);--> statement-breakpoint
CREATE POLICY "agent_runs_select" ON "agent_runs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_session_visible("agent_runs"."session_id")));--> statement-breakpoint
CREATE POLICY "agent_runs_insert" ON "agent_runs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select public.is_session_visible("agent_runs"."session_id")));--> statement-breakpoint
CREATE POLICY "agent_runs_update" ON "agent_runs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select public.is_session_visible("agent_runs"."session_id"))) WITH CHECK ((select public.is_session_visible("agent_runs"."session_id")));--> statement-breakpoint
CREATE POLICY "agent_runs_delete" ON "agent_runs" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select public.is_session_visible("agent_runs"."session_id")));--> statement-breakpoint
CREATE POLICY "agent_sessions_select" ON "agent_sessions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_rental_visible("agent_sessions"."rental_id")) and (select public.is_workspace_member("agent_sessions"."workspace_id")));--> statement-breakpoint
CREATE POLICY "agent_sessions_insert" ON "agent_sessions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select public.is_rental_visible("agent_sessions"."rental_id")) and (select public.is_workspace_member("agent_sessions"."workspace_id")));--> statement-breakpoint
CREATE POLICY "agent_sessions_update" ON "agent_sessions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select public.is_rental_visible("agent_sessions"."rental_id")) and (select public.is_workspace_member("agent_sessions"."workspace_id"))) WITH CHECK ((select public.is_rental_visible("agent_sessions"."rental_id")) and (select public.is_workspace_member("agent_sessions"."workspace_id")));--> statement-breakpoint
CREATE POLICY "agent_sessions_delete" ON "agent_sessions" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select public.is_workspace_owner("agent_sessions"."workspace_id")));--> statement-breakpoint
CREATE POLICY "crud-anonymous-policy-select" ON "agent_skills" AS PERMISSIVE FOR SELECT TO "anonymous" USING ("agent_skills"."published" = true);--> statement-breakpoint
CREATE POLICY "crud-anonymous-policy-insert" ON "agent_skills" AS PERMISSIVE FOR INSERT TO "anonymous" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-anonymous-policy-update" ON "agent_skills" AS PERMISSIVE FOR UPDATE TO "anonymous" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-anonymous-policy-delete" ON "agent_skills" AS PERMISSIVE FOR DELETE TO "anonymous" USING (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "agent_skills" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("agent_skills"."published" = true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "agent_skills" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "agent_skills" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "agent_skills" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "connector_grants" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.user_id() = "connector_grants"."user_id"::text) and (select public.is_workspace_member("connector_grants"."workspace_id")));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "connector_grants" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "connector_grants"."user_id"::text) and (select public.is_workspace_member("connector_grants"."workspace_id")));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "connector_grants" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "connector_grants"."user_id"::text) and (select public.is_workspace_member("connector_grants"."workspace_id"))) WITH CHECK ((select auth.user_id() = "connector_grants"."user_id"::text) and (select public.is_workspace_member("connector_grants"."workspace_id")));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "connector_grants" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "connector_grants"."user_id"::text) and (select public.is_workspace_member("connector_grants"."workspace_id")));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "favorites" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.user_id() = "favorites"."user_id"::text));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "favorites" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "favorites"."user_id"::text));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "favorites" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "favorites"."user_id"::text)) WITH CHECK ((select auth.user_id() = "favorites"."user_id"::text));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "favorites" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "favorites"."user_id"::text));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "memories" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.user_id() = "memories"."user_id"::text) and (select public.is_workspace_member("memories"."workspace_id")));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "memories" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "memories"."user_id"::text) and (select public.is_workspace_member("memories"."workspace_id")));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "memories" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "memories"."user_id"::text) and (select public.is_workspace_member("memories"."workspace_id"))) WITH CHECK ((select auth.user_id() = "memories"."user_id"::text) and (select public.is_workspace_member("memories"."workspace_id")));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "memories" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "memories"."user_id"::text) and (select public.is_workspace_member("memories"."workspace_id")));--> statement-breakpoint
CREATE POLICY "rentals_select" ON "rentals" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.user_id() = "rentals"."user_id"::text) or (select public.is_workspace_member("rentals"."workspace_id")));--> statement-breakpoint
CREATE POLICY "rentals_insert" ON "rentals" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "rentals"."user_id"::text) and (select public.is_workspace_member("rentals"."workspace_id")));--> statement-breakpoint
CREATE POLICY "rentals_update" ON "rentals" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "rentals"."user_id"::text) or (select public.is_workspace_owner("rentals"."workspace_id"))) WITH CHECK ((select auth.user_id() = "rentals"."user_id"::text) or (select public.is_workspace_owner("rentals"."workspace_id")));--> statement-breakpoint
CREATE POLICY "rentals_delete" ON "rentals" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "rentals"."user_id"::text));--> statement-breakpoint
CREATE POLICY "workspace_members_select" ON "workspace_members" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_workspace_member("workspace_members"."workspace_id")));--> statement-breakpoint
CREATE POLICY "workspace_members_insert" ON "workspace_members" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select public.is_workspace_owner("workspace_members"."workspace_id")));--> statement-breakpoint
CREATE POLICY "workspace_members_update" ON "workspace_members" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select public.is_workspace_owner("workspace_members"."workspace_id"))) WITH CHECK ((select public.is_workspace_owner("workspace_members"."workspace_id")));--> statement-breakpoint
CREATE POLICY "workspace_members_delete" ON "workspace_members" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select public.is_workspace_owner("workspace_members"."workspace_id")));--> statement-breakpoint
CREATE POLICY "workspaces_select" ON "workspaces" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.user_id() = "workspaces"."owner_user_id"::text) or (select public.is_workspace_member("workspaces"."id")));--> statement-breakpoint
CREATE POLICY "workspaces_insert" ON "workspaces" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "workspaces"."owner_user_id"::text));--> statement-breakpoint
CREATE POLICY "workspaces_update" ON "workspaces" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "workspaces"."owner_user_id"::text)) WITH CHECK ((select auth.user_id() = "workspaces"."owner_user_id"::text));--> statement-breakpoint
CREATE POLICY "workspaces_delete" ON "workspaces" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "workspaces"."owner_user_id"::text));
--> statement-breakpoint
ALTER TABLE "agent_profiles" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "agent_skills" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "workspaces" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "workspace_members" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "favorites" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "rentals" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "agent_sessions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "agent_runs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "memories" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "connector_grants" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO authenticated, anonymous;
--> statement-breakpoint
GRANT SELECT ON TABLE public.agent_profiles, public.agent_skills TO anonymous, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.workspaces,
  public.workspace_members,
  public.favorites,
  public.rentals,
  public.agent_sessions,
  public.agent_runs,
  public.memories,
  public.connector_grants
TO authenticated;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.workspaces_add_owner_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_user_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS workspaces_add_owner_member ON public.workspaces;
--> statement-breakpoint
CREATE TRIGGER workspaces_add_owner_member
AFTER INSERT ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.workspaces_add_owner_member();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS agent_profiles_set_updated_at ON public.agent_profiles;
--> statement-breakpoint
CREATE TRIGGER agent_profiles_set_updated_at
BEFORE UPDATE ON public.agent_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();