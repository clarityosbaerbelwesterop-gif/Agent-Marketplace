import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { connectorUiName } from "../lib/labels";
import { LEGAL_LINKS, LEGAL_OPERATOR } from "../lib/legal";
import { getFailoverPresentation } from "../lib/runtime/status";

const VENDOR_UI =
  /\b(Neon|Stripe|AWS|Vercel|Cloudflare|UNOROUTER|UnoRouter|FreeLLM|GITHUB_DISCOVERY_TOKEN)\b/;

function listTsx(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "api") {
        continue;
      }
      out.push(...listTsx(full));
    } else if (name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

describe("German legal chrome", () => {
  it("exposes impressum and datenschutz routes for the footer", () => {
    assert.deepEqual(
      LEGAL_LINKS.map((link) => link.href),
      ["/impressum", "/datenschutz"],
    );
    assert.equal(LEGAL_OPERATOR.brand, "Klarheit OS");
    assert.equal(LEGAL_OPERATOR.product, "Agent Marketplace");
  });

  it("keeps router status labels free of vendor marketing names", () => {
    const presentation = getFailoverPresentation({});
    const haystack = [
      presentation.primary.label,
      presentation.failover.label,
      presentation.notice,
    ].join(" ");
    assert.match(presentation.primary.label, /Modell-Router/);
    assert.match(presentation.failover.label, /Failover/);
    assert.equal(/UNOROUTER|FreeLLM|Neon|Stripe|Vercel/i.test(haystack), false);
  });

  it("maps vendor connector ids to neutral German labels", () => {
    assert.equal(connectorUiName("neon", "Neon"), "Datenbank");
    assert.equal(connectorUiName("vercel", "Vercel"), "Hosting");
    assert.equal(connectorUiName("stripe", "Stripe"), "Mandanten-Zahlung");
    assert.equal(connectorUiName("github", "GitHub"), "GitHub");
  });

  it("scrubs vendor marketing names from German UI tsx", () => {
    const files = [...listTsx("app"), ...listTsx("components")];
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      if (VENDOR_UI.test(text)) {
        hits.push(file);
      }
    }
    assert.deepEqual(hits, []);
  });
});
