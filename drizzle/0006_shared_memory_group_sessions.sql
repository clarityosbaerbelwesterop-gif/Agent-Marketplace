-- Shared workspace memories, group sessions, and recorded model provider.
-- Short per-statement RLS transactions (withUserRls); no global memory locks.

CREATE TYPE "public"."agent_session_kind" AS ENUM('solo', 'group');--> statement-breakpoint
CREATE TYPE "public"."memory_visibility" AS ENUM('user', 'workspace');--> statement-breakpoint
GRANT USAGE ON TYPE "public"."agent_session_kind" TO authenticated;--> statement-breakpoint
GRANT USAGE ON TYPE "public"."memory_visibility" TO authenticated;--> statement-breakpoint

ALTER TABLE "agent_sessions" ADD COLUMN "kind" "agent_session_kind" DEFAULT 'solo' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "provider_used" text;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "visibility" "memory_visibility" DEFAULT 'user' NOT NULL;--> statement-breakpoint

CREATE INDEX "agent_sessions_kind_status_idx" ON "agent_sessions" USING btree ("kind","status");--> statement-breakpoint
CREATE INDEX "memories_workspace_visibility_created_idx" ON "memories" USING btree ("workspace_id","visibility","created_at");--> statement-breakpoint

CREATE TABLE "agent_session_members" (
  "session_id" uuid NOT NULL,
  "rental_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "agent_session_members_pkey" PRIMARY KEY("session_id","rental_id")
);--> statement-breakpoint
ALTER TABLE "agent_session_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agent_session_members" ADD CONSTRAINT "agent_session_members_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_session_members" ADD CONSTRAINT "agent_session_members_rental_id_rentals_id_fk" FOREIGN KEY ("rental_id") REFERENCES "public"."rentals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_session_members_rental_id_idx" ON "agent_session_members" USING btree ("rental_id");--> statement-breakpoint

-- Session visible if the host rental is visible OR any group member rental is.
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
      AND (
        public.is_rental_visible(s.rental_id)
        OR EXISTS (
          SELECT 1
          FROM public.agent_session_members m
          WHERE m.session_id = s.id
            AND public.is_rental_visible(m.rental_id)
        )
      )
  );
$$;--> statement-breakpoint

DROP POLICY IF EXISTS "crud-authenticated-policy-select" ON "memories";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-insert" ON "memories";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-update" ON "memories";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-delete" ON "memories";--> statement-breakpoint

CREATE POLICY "memories_select" ON "memories" AS PERMISSIVE FOR SELECT TO "authenticated"
  USING ((select auth.user_id() = "memories"."user_id"::text OR "memories"."visibility" = 'workspace') AND (select public.is_workspace_member("memories"."workspace_id")));--> statement-breakpoint
CREATE POLICY "memories_insert" ON "memories" AS PERMISSIVE FOR INSERT TO "authenticated"
  WITH CHECK ((select auth.user_id() = "memories"."user_id"::text) AND (select public.is_workspace_member("memories"."workspace_id")));--> statement-breakpoint
CREATE POLICY "memories_update" ON "memories" AS PERMISSIVE FOR UPDATE TO "authenticated"
  USING ((select auth.user_id() = "memories"."user_id"::text) AND (select public.is_workspace_member("memories"."workspace_id")))
  WITH CHECK ((select auth.user_id() = "memories"."user_id"::text) AND (select public.is_workspace_member("memories"."workspace_id")));--> statement-breakpoint
CREATE POLICY "memories_delete" ON "memories" AS PERMISSIVE FOR DELETE TO "authenticated"
  USING ((select auth.user_id() = "memories"."user_id"::text) AND (select public.is_workspace_member("memories"."workspace_id")));--> statement-breakpoint

CREATE POLICY "agent_session_members_select" ON "agent_session_members" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_session_visible("agent_session_members"."session_id")));--> statement-breakpoint
CREATE POLICY "agent_session_members_insert" ON "agent_session_members" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select public.is_session_visible("agent_session_members"."session_id")) AND (select public.is_rental_visible("agent_session_members"."rental_id")));--> statement-breakpoint
CREATE POLICY "agent_session_members_update" ON "agent_session_members" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select public.is_session_visible("agent_session_members"."session_id"))) WITH CHECK ((select public.is_session_visible("agent_session_members"."session_id")) AND (select public.is_rental_visible("agent_session_members"."rental_id")));--> statement-breakpoint
CREATE POLICY "agent_session_members_delete" ON "agent_session_members" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select public.is_session_visible("agent_session_members"."session_id")));--> statement-breakpoint

ALTER TABLE "agent_session_members" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agent_session_members TO authenticated;
