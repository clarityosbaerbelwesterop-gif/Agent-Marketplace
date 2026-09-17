import type {
  AgentConnectorSpec,
  AgentPermissions,
  AgentRentalOptions,
} from "../lib/db/json";
import type { AgentTier } from "../lib/catalog/constants";
import { AGENT_CATEGORIES, AGENT_TIERS } from "../lib/catalog/constants";

export { AGENT_TIERS };

export const CATALOG_TARGET = 10_000;

export type SpecDef = {
  id: string;
  name: string;
  focus: string;
  outcome: string;
};

export type DomainDef = {
  id: string;
  name: string;
  constraint: string;
};

export type CategoryDef = {
  id: (typeof AGENT_CATEGORIES)[number];
  accent: string;
  languages: string[];
  connectors: string[];
  specializations: SpecDef[];
};

export const DOMAINS: DomainDef[] = [
  { id: "healthcare", name: "Healthcare", constraint: "clinical language, PHI-aware phrasing, no diagnosis" },
  { id: "fintech", name: "Fintech", constraint: "auditability, dual control, no invented yields or balances" },
  { id: "ecommerce", name: "Ecommerce", constraint: "catalog correctness, checkout edge cases, inventory honesty" },
  { id: "education", name: "Education", constraint: "age-appropriate tone, learning objectives, citation of sources" },
  { id: "climate", name: "Climate", constraint: "units, uncertainty ranges, no fabricated emissions numbers" },
  { id: "media", name: "Media", constraint: "attribution, rights, editorial vs advertising separation" },
  { id: "logistics", name: "Logistics", constraint: "lead times, capacity, no invented SLAs" },
  { id: "government", name: "Government", constraint: "public-record tone, accessibility, procurement constraints" },
  { id: "devtools", name: "Developer tools", constraint: "reproducible steps, version pins, no fake benchmark scores" },
  { id: "manufacturing", name: "Manufacturing", constraint: "safety, tolerances, change-control language" },
  { id: "travel", name: "Travel", constraint: "timezone honesty, policy limits, no invented availability" },
  { id: "nonprofit", name: "Nonprofit", constraint: "grant language, impact without vanity metrics" },
];

export const CATEGORY_DEFS: CategoryDef[] = [
  {
    id: "software",
    accent: "#3f3f46",
    languages: ["TypeScript", "English"],
    connectors: ["github"],
    specializations: [
      { id: "code-review", name: "Code reviewer", focus: "diff risk, API contracts, missing tests", outcome: "review notes with file-level findings" },
      { id: "refactor", name: "Refactoring guide", focus: "behavior-preserving change, seam identification", outcome: "a sequenced refactor plan" },
      { id: "api-design", name: "API designer", focus: "resource shape, idempotency, error taxonomy", outcome: "an API sketch and compatibility notes" },
      { id: "debug", name: "Debugger", focus: "repro, logs, bisect hypotheses", outcome: "a ranked set of next debugging steps" },
      { id: "legacy", name: "Legacy migrator", focus: "strangler seams, characterization tests", outcome: "a migration slice with rollback" },
      { id: "performance", name: "Performance tuner", focus: "hot paths, allocations, N+1", outcome: "a profile-informed change list" },
      { id: "docs-sync", name: "Implementation docs", focus: "code-to-docs drift", outcome: "updated module notes tied to symbols" },
      { id: "deps", name: "Dependency auditor", focus: "upgrade blast radius, lockfile hygiene", outcome: "an upgrade order with risk notes" },
      { id: "architecture", name: "Architecture partner", focus: "boundaries, coupling, failure domains", outcome: "a decision record candidate" },
      { id: "cli", name: "CLI author", focus: "flags, exit codes, piping", outcome: "a command spec and examples" },
      { id: "sdk", name: "SDK author", focus: "idiomatic wrappers, versioning", outcome: "client surface and examples" },
      { id: "harness", name: "Test harness builder", focus: "fixtures, fakes, determinism", outcome: "a test layout and first cases" },
    ],
  },
  {
    id: "frontend",
    accent: "#2563eb",
    languages: ["TypeScript", "CSS", "English"],
    connectors: ["github", "figma"],
    specializations: [
      { id: "react-ui", name: "React UI builder", focus: "composition, props, state locality", outcome: "component sketches and usage" },
      { id: "a11y", name: "Accessibility reviewer", focus: "names, roles, keyboard, contrast", outcome: "an a11y issue list with fixes" },
      { id: "css-systems", name: "CSS systems", focus: "tokens, cascade, responsive rules", outcome: "a styling plan without new frameworks" },
      { id: "design-tokens", name: "Token mapper", focus: "theme contract, dark/light", outcome: "token tables and mapping notes" },
      { id: "app-router", name: "App Router specialist", focus: "server/client split, params, loading", outcome: "route and data-fetching layout" },
      { id: "state", name: "State-management guide", focus: "server state vs UI state", outcome: "a state ownership map" },
      { id: "web-perf", name: "Web performance", focus: "LCP, hydration, bundle splits", outcome: "a performance change list" },
      { id: "components", name: "Component library", focus: "variants, slots, docs", outcome: "a primitive set and rules" },
      { id: "forms", name: "Forms specialist", focus: "validation, errors, progressive enhancement", outcome: "form model and field rules" },
      { id: "motion", name: "Motion spec", focus: "reduced-motion, duration, intent", outcome: "motion notes tied to UI states" },
      { id: "seo", name: "Frontend SEO", focus: "metadata, crawlable content, canonicals", outcome: "on-page SEO checklist" },
      { id: "i18n", name: "UI localization", focus: "copy extraction, plurals, layout overflow", outcome: "i18n wiring notes" },
    ],
  },
  {
    id: "backend",
    accent: "#7c3aed",
    languages: ["TypeScript", "English"],
    connectors: ["github"],
    specializations: [
      { id: "rest", name: "REST API builder", focus: "resources, pagination, idempotency", outcome: "endpoint contracts" },
      { id: "graphql", name: "GraphQL schema", focus: "types, n+1, authz at field level", outcome: "schema and resolver notes" },
      { id: "authz", name: "Authorization designer", focus: "roles vs relations, deny-by-default", outcome: "policy sketches" },
      { id: "queues", name: "Job queue designer", focus: "retries, poison messages, idempotency keys", outcome: "worker contracts" },
      { id: "events", name: "Event-driven design", focus: "outbox, ordering, consumers", outcome: "event catalog" },
      { id: "boundaries", name: "Service boundaries", focus: "data ownership, sync vs async", outcome: "context map notes" },
      { id: "cache", name: "Caching strategist", focus: "ttl, invalidation, stampede", outcome: "cache key design" },
      { id: "ratelimit", name: "Rate-limit designer", focus: "fairness, burst, identity keys", outcome: "limit policy" },
      { id: "webhooks", name: "Webhook designer", focus: "signing, retries, replay", outcome: "webhook contract" },
      { id: "grpc", name: "RPC specialist", focus: "deadlines, errors, compatibility", outcome: "service proto notes" },
      { id: "tenancy", name: "Multi-tenant backend", focus: "isolation, noisy neighbors, tenant keys", outcome: "tenancy rules" },
      { id: "observe", name: "Backend observability", focus: "spans, logs, SLIs", outcome: "instrumentation plan" },
    ],
  },
  {
    id: "databases",
    accent: "#0f766e",
    languages: ["SQL", "English"],
    connectors: ["postgres"],
    specializations: [
      { id: "schema", name: "Schema designer", focus: "normalization, constraints, keys", outcome: "DDL sketch" },
      { id: "query-tuning", name: "Query tuner", focus: "plans, indexes, rewrite", outcome: "rewritten SQL with rationale" },
      { id: "indexing", name: "Index designer", focus: "btree vs gin, covering, bloat", outcome: "index proposals" },
      { id: "migrations", name: "Migration author", focus: "expand/contract, locks, backfill", outcome: "ordered migration steps" },
      { id: "replication", name: "Replication advisor", focus: "lag, failover, replicas", outcome: "topology notes" },
      { id: "postgres-ops", name: "Postgres operator", focus: "autovacuum, bloat, extensions", outcome: "ops checklist" },
      { id: "modeling", name: "Data modeler", focus: "entities, slowly changing facts", outcome: "logical model" },
      { id: "partition", name: "Partitioning guide", focus: "range, prune, attach", outcome: "partition plan" },
      { id: "backup", name: "Backup/restore", focus: "RPO/RTO language, restore drills", outcome: "restore runbook outline" },
      { id: "rls", name: "RLS policy author", focus: "force rls, helpers, no recursion", outcome: "policy SQL notes" },
      { id: "jsonb", name: "JSONB document design", focus: "constraints, generated cols, gin", outcome: "document shape + queries" },
      { id: "etl", name: "Warehouse ETL", focus: "incremental loads, late facts", outcome: "pipeline sketch" },
    ],
  },
  {
    id: "devops",
    accent: "#c2410c",
    languages: ["YAML", "English"],
    connectors: ["github"],
    specializations: [
      { id: "ci", name: "CI pipeline designer", focus: "caching, matrix, required checks", outcome: "pipeline sketch" },
      { id: "containers", name: "Container packager", focus: "layers, non-root, sbom", outcome: "Dockerfile notes" },
      { id: "k8s", name: "Workload packager", focus: "probes, resources, rollouts", outcome: "manifest notes" },
      { id: "iac", name: "Infra-as-code", focus: "modules, state, blast radius", outcome: "change plan" },
      { id: "observability", name: "Observability stack", focus: "metrics, logs, traces", outcome: "signal map" },
      { id: "incidents", name: "Incident responder", focus: "severity, comms, rollback", outcome: "incident outline" },
      { id: "release", name: "Release engineer", focus: "flags, canaries, freeze windows", outcome: "release checklist" },
      { id: "secrets", name: "Secrets hygiene", focus: "rotation, least privilege, leak paths", outcome: "secret handling notes" },
      { id: "cost", name: "Cost control", focus: "idle resources, right-size, egress", outcome: "cost hypotheses" },
      { id: "edge", name: "Edge deploy", focus: "regions, cache, failover", outcome: "edge topology notes" },
      { id: "gitops", name: "GitOps designer", focus: "desired state, drift, promotions", outcome: "promotion flow" },
      { id: "capacity", name: "Capacity planner", focus: "headroom, queues, saturation", outcome: "capacity questions" },
    ],
  },
  {
    id: "QA",
    accent: "#0369a1",
    languages: ["TypeScript", "English"],
    connectors: ["github", "browser"],
    specializations: [
      { id: "strategy", name: "Test strategist", focus: "risk, coverage types, skip rules", outcome: "test strategy memo" },
      { id: "e2e", name: "End-to-end author", focus: "stable selectors, fixtures, isolation", outcome: "e2e case outlines" },
      { id: "contract", name: "Contract tester", focus: "consumer/provider, breaking changes", outcome: "contract cases" },
      { id: "exploratory", name: "Exploratory tester", focus: "charters, oracles, notes", outcome: "session charter" },
      { id: "regression", name: "Regression suite", focus: "prioritization, quarantine", outcome: "suite map" },
      { id: "load", name: "Load-test designer", focus: "scenarios, think time, SLOs as hypotheses", outcome: "load plan without fake numbers" },
      { id: "visual", name: "Visual regression", focus: "baselines, ignore regions", outcome: "visual check list" },
      { id: "flakes", name: "Flake hunter", focus: "timing, isolation, retries", outcome: "flake triage notes" },
      { id: "testdata", name: "Test-data designer", focus: "factories, PII, determinism", outcome: "data set notes" },
      { id: "a11y-qa", name: "Accessibility QA", focus: "wcag checks, keyboard paths", outcome: "a11y test cases" },
      { id: "mobile-qa", name: "Mobile QA", focus: "device matrix, interrupts", outcome: "mobile charters" },
      { id: "chaos", name: "Resilience tester", focus: "timeouts, dependency failure", outcome: "fault-injection cases" },
    ],
  },
  {
    id: "security",
    accent: "#b91c1c",
    languages: ["English"],
    connectors: ["github"],
    specializations: [
      { id: "threat-model", name: "Threat modeler", focus: "assets, actors, trust boundaries", outcome: "threat notes" },
      { id: "code-audit", name: "Secure-code reviewer", focus: "injection, authz, secrets", outcome: "finding list" },
      { id: "secrets", name: "Secrets reviewer", focus: "commits, env, rotation", outcome: "exposure notes" },
      { id: "cve", name: "Dependency CVE triage", focus: "reachability, upgrade vs ignore", outcome: "triage notes without CVSS invention" },
      { id: "iam", name: "IAM reviewer", focus: "roles, keys, federation", outcome: "access notes" },
      { id: "headers", name: "Appsec headers", focus: "csp, cookies, cors", outcome: "header policy" },
      { id: "auth-flows", name: "Auth-flow reviewer", focus: "sessions, oauth, recovery", outcome: "flow findings" },
      { id: "data-class", name: "Data classification", focus: "pii, retention, access", outcome: "data handling notes" },
      { id: "pentest-prep", name: "Pentest prep", focus: "scope, assets, out-of-scope", outcome: "rules of engagement draft" },
      { id: "sast", name: "SAST triage", focus: "true vs noisy, code paths", outcome: "finding disposition" },
      { id: "supply-chain", name: "Supply-chain review", focus: "builds, provenance, lockfiles", outcome: "supply-chain notes" },
      { id: "privacy", name: "Privacy review", focus: "purpose limitation, logs", outcome: "privacy questions" },
    ],
  },
  {
    id: "data analysis",
    accent: "#1d4ed8",
    languages: ["SQL", "English"],
    connectors: ["postgres"],
    specializations: [
      { id: "eda", name: "Exploratory analyst", focus: "distributions, missingness, joins", outcome: "EDA notes without fake stats" },
      { id: "sql-analytics", name: "SQL analyst", focus: "grain, windows, filters", outcome: "query pack" },
      { id: "dashboards", name: "Dashboard designer", focus: "questions, grain, caveats", outcome: "dashboard spec" },
      { id: "cohorts", name: "Cohort analyst", focus: "definitions, windows, leakage", outcome: "cohort definition" },
      { id: "forecast-setup", name: "Forecast setup", focus: "seasonality, holdout, caveats", outcome: "modeling brief without predicted numbers" },
      { id: "experiments", name: "Experiment readout", focus: "design, SRM, guardrails", outcome: "readout outline" },
      { id: "quality", name: "Data-quality analyst", focus: "nulls, duplicates, late data", outcome: "quality checks" },
      { id: "metrics", name: "Metric definition", focus: "numerator/denominator, owners", outcome: "metric spec" },
      { id: "spreadsheets", name: "Spreadsheet modeler", focus: "assumptions, audit trail", outcome: "model structure" },
      { id: "geo", name: "Geospatial analyst", focus: "crs, joins, privacy of points", outcome: "geo question list" },
      { id: "timeseries", name: "Time-series analyst", focus: "irregular sampling, calendar", outcome: "series notes" },
      { id: "attribution", name: "Attribution designer", focus: "windows, channels, identity", outcome: "attribution rules" },
    ],
  },
  {
    id: "research",
    accent: "#6d28d9",
    languages: ["English"],
    connectors: ["web"],
    specializations: [
      { id: "literature", name: "Literature reviewer", focus: "primary sources, recency, disagreement", outcome: "annotated source list" },
      { id: "competitive", name: "Competitive intel", focus: "public claims vs evidence", outcome: "comparison memo" },
      { id: "protocol", name: "Protocol analyst", focus: "RFCs, version diffs", outcome: "protocol notes" },
      { id: "source-eval", name: "Source evaluator", focus: "independence, incentives", outcome: "source grades (qualitative)" },
      { id: "synthesis", name: "Synthesis briefer", focus: "claims, counterclaims, gaps", outcome: "brief with gaps called out" },
      { id: "surveys", name: "Survey designer", focus: "bias, sampling, wording", outcome: "instrument draft" },
      { id: "patents", name: "Patent landscaper", focus: "classes, assignees, dates", outcome: "landscape outline" },
      { id: "market", name: "Market sizer setup", focus: "definitions, bottoms-up vs top-down", outcome: "sizing method without invented TAM" },
      { id: "experts", name: "Expert-interview guide", focus: "hypotheses, prompts", outcome: "interview guide" },
      { id: "evidence", name: "Evidence grader", focus: "study design, conflicts", outcome: "evidence table" },
      { id: "citations", name: "Citation graph", focus: "seminal vs derivative", outcome: "reading order" },
      { id: "unknowns", name: "Unknowns mapper", focus: "what would change our mind", outcome: "open-question list" },
    ],
  },
  {
    id: "writing",
    accent: "#0f766e",
    languages: ["English"],
    connectors: ["docs"],
    specializations: [
      { id: "tech-docs", name: "Technical writer", focus: "procedures, audience, accuracy", outcome: "doc draft" },
      { id: "release-notes", name: "Release-note writer", focus: "user impact, breaking changes", outcome: "notes draft" },
      { id: "rfc", name: "RFC writer", focus: "options, tradeoffs, rollback", outcome: "RFC skeleton" },
      { id: "editing", name: "Developmental editor", focus: "structure, cuts, claims", outcome: "edit memo" },
      { id: "ux-copy", name: "UX writer", focus: "microcopy, errors, empty states", outcome: "copy set" },
      { id: "grants", name: "Grant writer", focus: "aims, methods, constraints", outcome: "narrative outline" },
      { id: "exec", name: "Executive briefer", focus: "decision, options, risks", outcome: "one-pager" },
      { id: "tutorials", name: "Tutorial writer", focus: "prereqs, verified steps", outcome: "tutorial outline" },
      { id: "style", name: "Style-guide author", focus: "voice, terms, examples", outcome: "style rules" },
      { id: "postmortem", name: "Postmortem writer", focus: "timeline, contributing factors", outcome: "postmortem draft" },
      { id: "kb", name: "Knowledge-base author", focus: "findability, single source", outcome: "article set" },
      { id: "localization", name: "Localization editor", focus: "untranslatable UI, tone", outcome: "l10n notes" },
    ],
  },
  {
    id: "design",
    accent: "#db2777",
    languages: ["English"],
    connectors: ["figma"],
    specializations: [
      { id: "product-ui", name: "Product UI designer", focus: "flows, hierarchy, states", outcome: "UI notes" },
      { id: "systems", name: "Design-system designer", focus: "tokens, components, contribution", outcome: "system rules" },
      { id: "ia", name: "Information architect", focus: "nav, labels, findability", outcome: "IA map" },
      { id: "wireframes", name: "Wireframer", focus: "content first, layout", outcome: "wireframe inventory" },
      { id: "identity", name: "Visual identity", focus: "type, color, constraints", outcome: "identity notes" },
      { id: "illustration", name: "Illustration director", focus: "metaphor, consistency", outcome: "art direction" },
      { id: "motion", name: "Motion designer", focus: "intent, reduced motion", outcome: "motion spec" },
      { id: "a11y-design", name: "Inclusive designer", focus: "contrast, target size, language", outcome: "inclusive design notes" },
      { id: "content-design", name: "Content designer", focus: "structure, reading order", outcome: "content model" },
      { id: "critique", name: "Prototype critique", focus: "goals vs execution", outcome: "critique notes" },
      { id: "design-ops", name: "Design ops", focus: "handoff, versioning, QA", outcome: "ops checklist" },
      { id: "brand-voice", name: "Brand-voice designer", focus: "tone spectrum, examples", outcome: "voice chart" },
    ],
  },
  {
    id: "marketing",
    accent: "#d97706",
    languages: ["English"],
    connectors: ["analytics"],
    specializations: [
      { id: "positioning", name: "Positioning writer", focus: "who, alternative, value", outcome: "positioning memo" },
      { id: "landing", name: "Landing-page strategist", focus: "promise, proof, next step", outcome: "page outline" },
      { id: "seo-briefs", name: "SEO brief writer", focus: "intent, outline, unique angle", outcome: "content brief" },
      { id: "email", name: "Lifecycle email", focus: "trigger, usefulness, unsubscribe", outcome: "email series outline" },
      { id: "calendar", name: "Content calendar", focus: "themes, cadence, owners", outcome: "calendar sketch" },
      { id: "launches", name: "Launch planner", focus: "assets, audiences, freeze", outcome: "launch checklist" },
      { id: "instrument", name: "Analytics instrumentation", focus: "events, properties, PII", outcome: "tracking plan" },
      { id: "community", name: "Community planner", focus: "rituals, moderation", outcome: "community notes" },
      { id: "partners", name: "Partner enablement", focus: "one-pager, objections", outcome: "enablement kit outline" },
      { id: "search-copy", name: "Search ad copy", focus: "claims vs landing proof", outcome: "ad variants" },
      { id: "social-proof", name: "Social-proof editor", focus: "permission, specificity", outcome: "proof inventory" },
      { id: "plg", name: "Product-led growth", focus: "activation, aha, friction", outcome: "activation notes" },
    ],
  },
  {
    id: "sales",
    accent: "#15803d",
    languages: ["English"],
    connectors: ["crm"],
    specializations: [
      { id: "discovery", name: "Discovery coach", focus: "problems, stakeholders, timing", outcome: "discovery guide" },
      { id: "proposals", name: "Proposal writer", focus: "scope, assumptions, out-of-scope", outcome: "proposal outline" },
      { id: "objections", name: "Objection handler", focus: "clarify, evidence, next step", outcome: "objection map" },
      { id: "account-research", name: "Account researcher", focus: "public filings, org chart clues", outcome: "account brief" },
      { id: "demos", name: "Demo script", focus: "jobs-to-be-done, not feature tour", outcome: "demo narrative" },
      { id: "rfp", name: "RFP responder", focus: "compliance, honest gaps", outcome: "response matrix" },
      { id: "pipeline", name: "Pipeline hygiene", focus: "next step, close date honesty", outcome: "pipeline notes" },
      { id: "outbound", name: "Outbound sequence", focus: "relevance, brevity, opt-out", outcome: "sequence draft" },
      { id: "win-loss", name: "Win/loss interviewer", focus: "reasons, competitors, process", outcome: "interview guide" },
      { id: "pricing", name: "Pricing narrative", focus: "packaging, value, not invented discounts", outcome: "pricing talk track" },
      { id: "champions", name: "Champion mapper", focus: "economic buyer vs user", outcome: "influence map" },
      { id: "qbr", name: "QBR planner", focus: "outcomes, risks, asks", outcome: "QBR agenda" },
    ],
  },
  {
    id: "project management",
    accent: "#4338ca",
    languages: ["English"],
    connectors: ["issues"],
    specializations: [
      { id: "roadmap", name: "Roadmap facilitator", focus: "bets, sequencing, kill criteria", outcome: "roadmap notes" },
      { id: "sprints", name: "Sprint planner", focus: "capacity, goals, unplanned work", outcome: "sprint plan" },
      { id: "risks", name: "Risk register", focus: "likelihood language, owners, triggers", outcome: "risk list" },
      { id: "stakeholders", name: "Stakeholder updater", focus: "audience, decisions needed", outcome: "status update" },
      { id: "deps", name: "Dependency tracker", focus: "handoffs, slack, critical path", outcome: "dependency map" },
      { id: "kickoff", name: "Kickoff designer", focus: "goals, non-goals, working agreements", outcome: "kickoff agenda" },
      { id: "retro", name: "Retro facilitator", focus: "safety, actions, owners", outcome: "retro plan" },
      { id: "capacity", name: "Capacity planner", focus: "focus time, meetings, PTO", outcome: "capacity view" },
      { id: "raci", name: "RACI author", focus: "one accountable, few consulted", outcome: "RACI table" },
      { id: "launch-pm", name: "Launch checklist PM", focus: "gates, comms, rollback", outcome: "launch checklist" },
      { id: "status", name: "Status reporter", focus: "facts, asks, next", outcome: "status report" },
      { id: "scope", name: "Scope controller", focus: "change requests, tradeoffs", outcome: "scope decision" },
    ],
  },
];

export type TierConfig = {
  id: AgentTier;
  label: string;
  skillVersion: string;
  temperature: number;
  maxOutputTokens: number;
  topP: number;
  network: AgentPermissions["network"];
  files: AgentPermissions["files"];
  extraConnectors: string[];
  tools: string[];
  rental: AgentRentalOptions;
  availability: "available" | "waitlist";
};

export const TIER_CONFIG: Record<AgentTier, TierConfig> = {
  standard: {
    id: "standard",
    label: "Standard",
    skillVersion: "1.0.0",
    temperature: 0.3,
    maxOutputTokens: 2048,
    topP: 1,
    network: "none",
    files: "none",
    extraConnectors: [],
    tools: ["read"],
    rental: {
      usageUnit: "tokens",
      durations: [
        { id: "4h", label: "4 hours", durationHours: 4, priceCents: 900, currency: "USD", usageIncluded: 40_000 },
        { id: "24h", label: "1 day", durationHours: 24, priceCents: 1900, currency: "USD", usageIncluded: 160_000 },
        { id: "7d", label: "7 days", durationHours: 168, priceCents: 7900, currency: "USD", usageIncluded: 800_000 },
      ],
    },
    availability: "available",
  },
  advanced: {
    id: "advanced",
    label: "Advanced",
    skillVersion: "1.1.0",
    temperature: 0.35,
    maxOutputTokens: 4096,
    topP: 1,
    network: "limited",
    files: "none",
    extraConnectors: [],
    tools: ["read", "search"],
    rental: {
      usageUnit: "tokens",
      durations: [
        { id: "4h", label: "4 hours", durationHours: 4, priceCents: 1900, currency: "USD", usageIncluded: 80_000 },
        { id: "24h", label: "1 day", durationHours: 24, priceCents: 4900, currency: "USD", usageIncluded: 320_000 },
        { id: "7d", label: "7 days", durationHours: 168, priceCents: 19_900, currency: "USD", usageIncluded: 1_600_000 },
      ],
    },
    availability: "available",
  },
  expert: {
    id: "expert",
    label: "Expert",
    skillVersion: "1.2.0",
    temperature: 0.4,
    maxOutputTokens: 8192,
    topP: 0.95,
    network: "limited",
    files: "read",
    extraConnectors: [],
    tools: ["read", "search", "diff"],
    rental: {
      usageUnit: "tokens",
      durations: [
        { id: "4h", label: "4 hours", durationHours: 4, priceCents: 4900, currency: "USD", usageIncluded: 160_000 },
        { id: "24h", label: "1 day", durationHours: 24, priceCents: 12_900, currency: "USD", usageIncluded: 640_000 },
        { id: "7d", label: "7 days", durationHours: 168, priceCents: 49_900, currency: "USD", usageIncluded: 3_200_000 },
      ],
    },
    availability: "available",
  },
  elite: {
    id: "elite",
    label: "Elite",
    skillVersion: "2.0.0",
    temperature: 0.45,
    maxOutputTokens: 16_384,
    topP: 0.95,
    network: "full",
    files: "read",
    extraConnectors: ["web"],
    tools: ["read", "search", "diff", "plan"],
    rental: {
      usageUnit: "tokens",
      durations: [
        { id: "4h", label: "4 hours", durationHours: 4, priceCents: 9900, currency: "USD", usageIncluded: 320_000 },
        { id: "24h", label: "1 day", durationHours: 24, priceCents: 29_900, currency: "USD", usageIncluded: 1_280_000 },
        { id: "7d", label: "7 days", durationHours: 168, priceCents: 99_000, currency: "USD", usageIncluded: 6_400_000 },
      ],
    },
    availability: "available",
  },
  frontier: {
    id: "frontier",
    label: "Frontier",
    skillVersion: "2.1.0",
    temperature: 0.5,
    maxOutputTokens: 32_768,
    topP: 0.9,
    network: "full",
    files: "readwrite",
    extraConnectors: ["web", "github"],
    tools: ["read", "search", "diff", "plan", "apply"],
    rental: {
      usageUnit: "tokens",
      durations: [
        { id: "4h", label: "4 hours", durationHours: 4, priceCents: 19_900, currency: "USD", usageIncluded: 640_000 },
        { id: "24h", label: "1 day", durationHours: 24, priceCents: 59_900, currency: "USD", usageIncluded: 2_560_000 },
        { id: "7d", label: "7 days", durationHours: 168, priceCents: 199_000, currency: "USD", usageIncluded: 12_800_000 },
      ],
    },
    availability: "waitlist",
  },
};

export function categorySlug(category: string): string {
  return category.toLowerCase().replace(/\s+/g, "-");
}

export function skillSlug(category: string, specId: string): string {
  return `${categorySlug(category)}.${specId}`;
}

export function skillPackageRef(category: string, specId: string, tier: AgentTier): string {
  return `${skillSlug(category, specId)}@${TIER_CONFIG[tier].skillVersion}`;
}

export type CatalogCombo = {
  index: number;
  category: CategoryDef;
  spec: SpecDef;
  domain: DomainDef;
  tier: TierConfig;
};

export function comboAt(index: number): CatalogCombo {
  const specCount = 12;
  const domainCount = DOMAINS.length;
  const tierCount = AGENT_TIERS.length;
  const categoryCount = CATEGORY_DEFS.length;

  let n = index;
  const tier = TIER_CONFIG[AGENT_TIERS[n % tierCount]];
  n = Math.floor(n / tierCount);
  const domain = DOMAINS[n % domainCount];
  n = Math.floor(n / domainCount);
  const specIndex = n % specCount;
  n = Math.floor(n / specCount);
  const category = CATEGORY_DEFS[n % categoryCount];
  const spec = category.specializations[specIndex];

  return { index, category, spec, domain, tier };
}

export function assertCatalogShape(): void {
  if (CATEGORY_DEFS.length !== AGENT_CATEGORIES.length) {
    throw new Error("CATEGORY_DEFS length mismatch");
  }
  for (const category of CATEGORY_DEFS) {
    if (category.specializations.length !== 12) {
      throw new Error(`${category.id} must have 12 specializations`);
    }
  }
  const unique = 14 * 12 * DOMAINS.length * 5;
  if (unique < CATALOG_TARGET) {
    throw new Error(`Not enough unique combos: ${unique} < ${CATALOG_TARGET}`);
  }
}

export function connectorsFor(combo: CatalogCombo): AgentConnectorSpec[] {
  const names = new Set([
    ...combo.category.connectors,
    ...combo.tier.extraConnectors,
  ]);
  return [...names].map((provider, i) => ({
    provider,
    required: i === 0 && combo.tier.id !== "standard",
    scopes: provider === "github" ? ["repo:read"] : undefined,
  }));
}

export function permissionsFor(combo: CatalogCombo): AgentPermissions {
  return {
    tools: combo.tier.tools,
    network: combo.tier.network,
    files: combo.tier.files,
  };
}

export function ratingStatusFor(index: number): "untested" | "baselined" {
  return index % 4 === 0 ? "baselined" : "untested";
}

export function languagesFor(combo: CatalogCombo): string[] {
  const langs = [...combo.category.languages];
  if (combo.index % 9 === 0 && !langs.includes("German")) {
    langs.push("German");
  }
  if (combo.index % 11 === 0 && !langs.includes("Spanish")) {
    langs.push("Spanish");
  }
  return langs;
}

export function agentSlugFor(combo: CatalogCombo): string {
  return [
    categorySlug(combo.category.id),
    combo.spec.id,
    combo.domain.id,
    combo.tier.id,
  ].join("-");
}

export function agentNameFor(combo: CatalogCombo): string {
  return `${combo.spec.name} · ${combo.domain.name} (${combo.tier.label})`;
}

export function agentTaglineFor(combo: CatalogCombo): string {
  return `${combo.spec.focus} in ${combo.domain.name.toLowerCase()} work.`;
}

export function agentDescriptionFor(combo: CatalogCombo): string {
  return [
    `${combo.spec.name} for ${combo.domain.name} ${combo.category.id} work.`,
    `Focus: ${combo.spec.focus}. Domain constraint: ${combo.domain.constraint}.`,
    `Delivers ${combo.spec.outcome}. Scope is ${combo.tier.label.toLowerCase()}: ${combo.tier.network} network, ${combo.tier.files} files, model alias "${combo.tier.id}".`,
    `Does not invent benchmarks, success rates, or user counts.`,
  ].join(" ");
}

export function skillInstructions(category: CategoryDef, spec: SpecDef, version: string): string {
  return [
    `Skill package ${skillSlug(category.id, spec.id)}@${version} for ${category.id}.`,
    `Role: ${spec.name}. Focus: ${spec.focus}.`,
    `Produce ${spec.outcome}. Stay inside the stated domain constraints supplied at runtime.`,
    `Refuse requests for fabricated metrics, leaderboard scores, or implied production traffic.`,
    version.startsWith("2.")
      ? "This major version may propose sequenced work and checklists; still no invented measurements."
      : "This minor version stays to a single artifact and explicit assumptions.",
  ].join(" ");
}
