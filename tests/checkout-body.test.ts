import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCreateRentalBody } from "../lib/api/create-rental-body";

describe("POST /api/rentals and POST /api/checkout body contract", () => {
  it("accepts the shared { slug, durationId } payload", () => {
    const parsed = parseCreateRentalBody({
      slug: " software-alpha-web-standard ",
      durationId: "24h",
    });
    assert.deepEqual(parsed, {
      ok: true,
      slug: "software-alpha-web-standard",
      durationId: "24h",
    });
  });

  it("requires a non-empty slug on both routes", () => {
    for (const body of [null, {}, { slug: "" }, { slug: "   " }, { slug: 1 }]) {
      const parsed = parseCreateRentalBody(body);
      assert.equal(parsed.ok, false);
      if (!parsed.ok) {
        assert.equal(parsed.status, 400);
        assert.equal(parsed.error, body === null ? "Invalid JSON" : "slug is required");
      }
    }
  });

  it("treats missing durationId as optional (same as both route handlers)", () => {
    const parsed = parseCreateRentalBody({ slug: "frontend-beta-app-advanced" });
    assert.deepEqual(parsed, {
      ok: true,
      slug: "frontend-beta-app-advanced",
      durationId: undefined,
    });
  });
});
