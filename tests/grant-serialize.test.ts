import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIRST_WAVE_CONNECTOR_IDS,
  SECOND_WAVE_CONNECTOR_IDS,
  connectorCatalog,
  jsonSecretLeaks,
  latestActiveRental,
  partitionConnectorCatalog,
  pendingGrantStubRow,
  pendingGrantStubsForWorkspace,
  sanitizePublicMetadata,
  toPublicGrant,
} from "../lib/connectors";
import { CONNECTOR_REGISTRY } from "../lib/connectors/registry";

const PLANTED = {
  accessToken: "sk_live_PLANTED_ACCESS_TOKEN",
  refreshToken: "refresh_PLANTED_REFRESH",
  apiKey: "sk_test_PLANTED_API_KEY",
  stripeSecret: "sk_live_PLANTED_STRIPE_SECRET",
  clientSecret: "whsec_PLANTED_CLIENT_SECRET",
  githubPat: "ghp_PLANTEDGITHUBPAT",
} as const;

const FORBIDDEN = Object.values(PLANTED);

describe("first-wave pending grant stubs (unpaid or paid activation)", () => {
  it("covers every first-wave provider as pending with null credentials", () => {
    const stubs = pendingGrantStubsForWorkspace({
      userId: "11111111-1111-4111-8111-111111111111",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      providers: FIRST_WAVE_CONNECTOR_IDS,
    });
    assert.equal(stubs.length, FIRST_WAVE_CONNECTOR_IDS.length);
    for (const stub of stubs) {
      assert.equal(stub.status, "pending");
      assert.equal(stub.credentials, null);
      assert.ok(
        (FIRST_WAVE_CONNECTOR_IDS as readonly string[]).includes(stub.provider),
      );
      assert.deepEqual(
        stub.scopes,
        [...CONNECTOR_REGISTRY[stub.provider].requiredScopes],
      );
      const encoded = JSON.stringify(stub);
      assert.equal(encoded.includes("granted"), false);
      assert.equal(jsonSecretLeaks(stub, FORBIDDEN).length, 0);
    }
  });

  it("does not invent OAuth clients for second-wave stubs", () => {
    for (const id of SECOND_WAVE_CONNECTOR_IDS) {
      assert.equal(CONNECTOR_REGISTRY[id].oauth, null);
      const stub = pendingGrantStubRow({
        userId: "u",
        workspaceId: "w",
        provider: id,
      });
      assert.equal(stub.status, "pending");
      assert.equal(stub.credentials, null);
      assert.equal(stub.metadata.authMethod, "api_key");
    }
  });
});

describe("toPublicGrant never leaks vendor secrets", () => {
  it("omits credentials blobs and secret metadata keys from JSON", () => {
    const publicGrant = toPublicGrant({
      id: "grant-1",
      provider: "stripe",
      scopes: [],
      status: "granted",
      credentials: {
        accessToken: PLANTED.accessToken,
        refreshToken: PLANTED.refreshToken,
        apiKeys: {
          STRIPE_SECRET_KEY: PLANTED.stripeSecret,
          NEON_API_KEY: PLANTED.apiKey,
        },
      },
      metadata: {
        authMethod: "api_key",
        accessToken: PLANTED.accessToken,
        clientSecret: PLANTED.clientSecret,
        STRIPE_SECRET_KEY: PLANTED.stripeSecret,
        nested: { token: PLANTED.githubPat },
        accountLabel: "acct_ok_to_show",
      },
      createdAt: new Date("2026-09-17T19:00:00.000Z"),
      updatedAt: new Date("2026-09-17T19:00:00.000Z"),
    });

    assert.equal(publicGrant.status, "active");
    assert.equal(publicGrant.hasCredentials, true);
    assert.equal("credentials" in publicGrant, false);
    assert.equal("accessToken" in publicGrant, false);
    assert.equal("apiKeys" in publicGrant, false);
    assert.equal(publicGrant.metadata.authMethod, "api_key");
    assert.equal(publicGrant.metadata.accountLabel, "acct_ok_to_show");
    assert.equal(publicGrant.metadata.accessToken, undefined);
    assert.equal(publicGrant.metadata.clientSecret, undefined);
    assert.equal(publicGrant.metadata.STRIPE_SECRET_KEY, undefined);

    const leaks = jsonSecretLeaks(publicGrant, FORBIDDEN);
    assert.deepEqual(leaks, []);
  });

  it("strips secret-looking strings from metadata even under innocent keys", () => {
    const cleaned = sanitizePublicMetadata({
      note: PLANTED.stripeSecret,
      authMethod: "oauth",
    });
    assert.equal(cleaned.authMethod, "oauth");
    assert.equal(cleaned.note, undefined);
  });

  it("keeps catalog list JSON free of planted credentials on attached grants", () => {
    const items = connectorCatalog([
      toPublicGrant({
        id: "grant-github",
        provider: "github",
        scopes: ["repo"],
        status: "granted",
        credentials: { accessToken: PLANTED.githubPat },
        metadata: { accessToken: PLANTED.githubPat },
        createdAt: "2026-09-17T19:00:00.000Z",
        updatedAt: "2026-09-17T19:00:00.000Z",
      }),
    ]);
    const github = items.find((item) => item.id === "github");
    assert.ok(github);
    assert.equal(github?.grantable, true);
    assert.equal(github?.wave, "first");
    assert.equal(github?.grant?.hasCredentials, true);
    assert.deepEqual(jsonSecretLeaks(items, FORBIDDEN), []);

    const higgsfield = items.find((item) => item.id === "higgsfield");
    assert.equal(higgsfield?.wave, "stub");
    assert.equal(higgsfield?.grantable, true);
  });
});

describe("Grants registry vs discovery", () => {
  it("lists first-wave as requestable registry rows and stubs separately", () => {
    const { firstWave, stubs } = partitionConnectorCatalog(connectorCatalog());
    assert.deepEqual(
      firstWave.map((item) => item.id),
      [...FIRST_WAVE_CONNECTOR_IDS],
    );
    assert.deepEqual(
      stubs.map((item) => item.id),
      [...SECOND_WAVE_CONNECTOR_IDS],
    );
    assert.ok(firstWave.every((item) => item.grantable && item.wave === "first"));
    assert.ok(stubs.every((item) => item.grantable && item.wave === "stub"));
  });

  it("picks the newest active rental for /connectors without rentalId", () => {
    assert.equal(latestActiveRental([]), null);
    assert.equal(
      latestActiveRental([{ id: "newest" }, { id: "older" }])?.id,
      "newest",
    );
  });
});
