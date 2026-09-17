-- Multi-agent group rooms. Members must be the owner's active rentals.
CREATE TYPE "public"."agent_room_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."agent_room_author" AS ENUM('user', 'agent', 'system');--> statement-breakpoint

CREATE TABLE "agent_rooms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "owner_user_id" uuid NOT NULL,
  "title" text NOT NULL,
  "status" "agent_room_status" DEFAULT 'open' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "agent_rooms" ADD CONSTRAINT "agent_rooms_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_rooms_owner_user_id_idx" ON "agent_rooms" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "agent_rooms_workspace_id_idx" ON "agent_rooms" USING btree ("workspace_id");--> statement-breakpoint
ALTER TABLE "agent_rooms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agent_rooms" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.is_agent_room_visible(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agent_rooms r
    WHERE r.id = p_room_id
      AND (
        auth.user_id() = r.owner_user_id::text
        OR public.is_workspace_member(r.workspace_id)
      )
  );
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.is_agent_room_owner(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agent_rooms r
    WHERE r.id = p_room_id
      AND auth.user_id() = r.owner_user_id::text
  );
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION public.is_agent_room_visible(uuid) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.is_agent_room_owner(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_agent_room_visible(uuid) TO authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_agent_room_owner(uuid) TO authenticated;--> statement-breakpoint

CREATE POLICY "agent_rooms_select" ON "agent_rooms" AS PERMISSIVE FOR SELECT TO "authenticated"
  USING ((select auth.user_id() = "agent_rooms"."owner_user_id"::text) or (select public.is_workspace_member("agent_rooms"."workspace_id")));--> statement-breakpoint
CREATE POLICY "agent_rooms_insert" ON "agent_rooms" AS PERMISSIVE FOR INSERT TO "authenticated"
  WITH CHECK ((select auth.user_id() = "agent_rooms"."owner_user_id"::text) and (select public.is_workspace_member("agent_rooms"."workspace_id")));--> statement-breakpoint
CREATE POLICY "agent_rooms_update" ON "agent_rooms" AS PERMISSIVE FOR UPDATE TO "authenticated"
  USING ((select auth.user_id() = "agent_rooms"."owner_user_id"::text))
  WITH CHECK ((select auth.user_id() = "agent_rooms"."owner_user_id"::text));--> statement-breakpoint
CREATE POLICY "agent_rooms_delete" ON "agent_rooms" AS PERMISSIVE FOR DELETE TO "authenticated"
  USING ((select auth.user_id() = "agent_rooms"."owner_user_id"::text));--> statement-breakpoint

CREATE TABLE "agent_room_members" (
  "room_id" uuid NOT NULL,
  "rental_id" uuid NOT NULL,
  "session_id" uuid,
  "agent_profile_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "agent_room_members_pkey" PRIMARY KEY ("room_id","rental_id")
);--> statement-breakpoint
ALTER TABLE "agent_room_members" ADD CONSTRAINT "agent_room_members_room_id_agent_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."agent_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_room_members" ADD CONSTRAINT "agent_room_members_rental_id_rentals_id_fk" FOREIGN KEY ("rental_id") REFERENCES "public"."rentals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_room_members" ADD CONSTRAINT "agent_room_members_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_room_members" ADD CONSTRAINT "agent_room_members_agent_profile_id_agent_profiles_id_fk" FOREIGN KEY ("agent_profile_id") REFERENCES "public"."agent_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_room_members_rental_id_idx" ON "agent_room_members" USING btree ("rental_id");--> statement-breakpoint
ALTER TABLE "agent_room_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agent_room_members" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "agent_room_members_select" ON "agent_room_members" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_agent_room_visible("agent_room_members"."room_id")));--> statement-breakpoint
CREATE POLICY "agent_room_members_insert" ON "agent_room_members" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select public.is_agent_room_owner("agent_room_members"."room_id")));--> statement-breakpoint
CREATE POLICY "agent_room_members_update" ON "agent_room_members" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select public.is_agent_room_owner("agent_room_members"."room_id"))) WITH CHECK ((select public.is_agent_room_owner("agent_room_members"."room_id")));--> statement-breakpoint
CREATE POLICY "agent_room_members_delete" ON "agent_room_members" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select public.is_agent_room_owner("agent_room_members"."room_id")));--> statement-breakpoint

CREATE TABLE "agent_room_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "room_id" uuid NOT NULL,
  "author_kind" "agent_room_author" NOT NULL,
  "rental_id" uuid,
  "run_id" uuid,
  "content" text NOT NULL,
  "status" text DEFAULT 'complete' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "agent_room_messages" ADD CONSTRAINT "agent_room_messages_room_id_agent_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."agent_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_room_messages" ADD CONSTRAINT "agent_room_messages_rental_id_rentals_id_fk" FOREIGN KEY ("rental_id") REFERENCES "public"."rentals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_room_messages" ADD CONSTRAINT "agent_room_messages_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_room_messages_room_id_idx" ON "agent_room_messages" USING btree ("room_id","created_at");--> statement-breakpoint
ALTER TABLE "agent_room_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agent_room_messages" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "agent_room_messages_select" ON "agent_room_messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_agent_room_visible("agent_room_messages"."room_id")));--> statement-breakpoint
CREATE POLICY "agent_room_messages_insert" ON "agent_room_messages" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select public.is_agent_room_visible("agent_room_messages"."room_id")));--> statement-breakpoint
CREATE POLICY "agent_room_messages_update" ON "agent_room_messages" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select public.is_agent_room_visible("agent_room_messages"."room_id"))) WITH CHECK ((select public.is_agent_room_visible("agent_room_messages"."room_id")));--> statement-breakpoint
CREATE POLICY "agent_room_messages_delete" ON "agent_room_messages" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select public.is_agent_room_owner("agent_room_messages"."room_id")));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.agent_rooms,
  public.agent_room_members,
  public.agent_room_messages
TO authenticated;
