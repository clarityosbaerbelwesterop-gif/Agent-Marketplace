-- Agent family filter (Coding / Marketing / Design / Sales) without a 10k reseed.
-- Backfill from existing category heuristics. Unknown leftover categories stay NULL.
ALTER TABLE "agent_profiles" ADD COLUMN "family" text;--> statement-breakpoint
UPDATE "agent_profiles" SET "family" = CASE
  WHEN "category" IN ('software', 'frontend', 'backend', 'databases', 'devops', 'QA', 'security', 'data analysis') THEN 'coding'
  WHEN "category" IN ('marketing', 'writing', 'research') THEN 'marketing'
  WHEN "category" IN ('design') THEN 'design'
  WHEN "category" IN ('sales', 'project management') THEN 'sales'
  ELSE "family"
END
WHERE "family" IS NULL;--> statement-breakpoint
CREATE INDEX "agent_profiles_family_idx" ON "agent_profiles" USING btree ("family");
