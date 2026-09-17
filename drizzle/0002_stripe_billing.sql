-- Stripe Checkout / webhook billing tables.
-- No GRANT to authenticated/anonymous: webhook writes use neondb_owner (BYPASSRLS).
CREATE TYPE "public"."rental_payment_kind" AS ENUM('purchase', 'renewal');--> statement-breakpoint
CREATE TYPE "public"."rental_payment_status" AS ENUM('open', 'paid', 'canceled');--> statement-breakpoint
CREATE TABLE "rental_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rental_id" uuid NOT NULL,
	"kind" "rental_payment_kind" NOT NULL,
	"status" "rental_payment_status" DEFAULT 'open' NOT NULL,
	"duration_id" text NOT NULL,
	"duration_hours" integer NOT NULL,
	"usage_included" integer DEFAULT 0 NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rental_payments_stripe_session_id_uidx" UNIQUE("stripe_session_id"),
	CONSTRAINT "rental_payments_stripe_payment_intent_id_uidx" UNIQUE("stripe_payment_intent_id")
);
--> statement-breakpoint
ALTER TABLE "rental_payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"rental_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stripe_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rental_payments" ADD CONSTRAINT "rental_payments_rental_id_rentals_id_fk" FOREIGN KEY ("rental_id") REFERENCES "public"."rentals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_events" ADD CONSTRAINT "stripe_events_rental_id_rentals_id_fk" FOREIGN KEY ("rental_id") REFERENCES "public"."rentals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rental_payments_rental_id_idx" ON "rental_payments" USING btree ("rental_id");--> statement-breakpoint
CREATE INDEX "rental_payments_status_idx" ON "rental_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stripe_events_rental_id_idx" ON "stripe_events" USING btree ("rental_id");
--> statement-breakpoint
ALTER TABLE "rental_payments" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "stripe_events" FORCE ROW LEVEL SECURITY;
