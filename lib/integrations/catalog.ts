import { getFixtureAgent, UI_FIXTURE_DISCLAIMER } from "@/lib/fixtures/agents";

/**
 * UI fixtures remain for design samples only.
 * Live catalog reads go through `@/lib/catalog/queries` (paginated Postgres).
 */
export { UI_FIXTURE_DISCLAIMER, getFixtureAgent };
