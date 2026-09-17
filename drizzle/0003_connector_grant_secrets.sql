-- Tenant connector grant metadata + credentials (never returned by public APIs).
ALTER TABLE "connector_grants" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "connector_grants" ADD COLUMN "credentials" jsonb;--> statement-breakpoint
ALTER TABLE "connector_grants" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
