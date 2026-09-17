import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCompareSlugs } from "../lib/catalog/compare";
import { MAX_COMPARE_SLUGS } from "../lib/catalog/constants";

describe("parseCompareSlugs", () => {
  it("rejects zero slugs", () => {
    const empty = parseCompareSlugs(new URLSearchParams());
    assert.equal("error" in empty, true);
    if ("error" in empty) {
      assert.equal(empty.status, 400);
      assert.match(empty.error, /slugs is required/);
    }

    const blank = parseCompareSlugs(new URLSearchParams("slugs=,,,"));
    assert.equal("error" in blank, true);
    if ("error" in blank) {
      assert.equal(blank.status, 400);
    }
  });

  it("rejects more than four unique slugs", () => {
    const slugs = [
      "software-alpha-web-standard",
      "frontend-beta-app-advanced",
      "backend-gamma-api-expert",
      "devops-delta-ops-elite",
      "security-epsilon-audit-frontier",
    ];
    assert.equal(slugs.length, MAX_COMPARE_SLUGS + 1);
    const parsed = parseCompareSlugs(
      new URLSearchParams(`slugs=${slugs.join(",")}`),
    );
    assert.equal("error" in parsed, true);
    if ("error" in parsed) {
      assert.equal(parsed.status, 400);
      assert.match(parsed.error, /at most 4/);
    }
  });

  it("accepts 1–4 unique slugs and keeps request order", () => {
    const parsed = parseCompareSlugs(
      new URLSearchParams(
        "slugs=software-alpha-web-standard,frontend-beta-app-advanced",
      ),
    );
    assert.equal("error" in parsed, false);
    if ("slugs" in parsed) {
      assert.deepEqual(parsed.slugs, [
        "software-alpha-web-standard",
        "frontend-beta-app-advanced",
      ]);
    }
  });

  it("dedupes case-insensitively and ignores extra commas", () => {
    const parsed = parseCompareSlugs(
      new URLSearchParams("slugs=Alpha-Agent,alpha-agent,beta-agent"),
    );
    assert.equal("error" in parsed, false);
    if ("slugs" in parsed) {
      assert.deepEqual(parsed.slugs, ["Alpha-Agent", "beta-agent"]);
    }
  });

  it("rejects invalid slug characters", () => {
    const parsed = parseCompareSlugs(new URLSearchParams("slugs=not a slug"));
    assert.equal("error" in parsed, true);
    if ("error" in parsed) {
      assert.equal(parsed.status, 400);
      assert.match(parsed.error, /Invalid slug/);
    }
  });
});
