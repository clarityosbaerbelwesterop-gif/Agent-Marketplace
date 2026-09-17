-- Audit columns for ordered rental end (owner-only POST /api/rentals/[id]/end).
ALTER TABLE "rentals" ADD COLUMN "ended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rentals" ADD COLUMN "ended_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "rentals" ADD COLUMN "end_reason" text;
