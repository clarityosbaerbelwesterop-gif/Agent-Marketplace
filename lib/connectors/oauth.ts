import { createHmac, timingSafeEqual } from "node:crypto";
import type { ConnectorDefinition, ConnectorId } from "./types";
import { getConnector, oauthEnvConfigured, readEnvSecret } from "./registry";

export type OauthStatePayload = {
  u: string;
  w: string;
  p: ConnectorId;
  r: string | null;
  n: string;
  e: number;
};

function stateSecret(): string | null {
  const secret =
    process.env.CONNECTOR_OAUTH_STATE_SECRET?.trim() ||
    process.env.NEON_AUTH_COOKIE_SECRET?.trim() ||
    "";
  return secret.length >= 32 ? secret : null;
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function encodeOauthState(payload: OauthStatePayload): string | null {
  const secret = stateSecret();
  if (!secret) {
    return null;
  }
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function decodeOauthState(raw: string): OauthStatePayload | null {
  const secret = stateSecret();
  if (!secret) {
    return null;
  }
  const [body, signature] = raw.split(".");
  if (!body || !signature) {
    return null;
  }
  const expected = sign(body, secret);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as OauthStatePayload;
    if (
      !parsed ||
      typeof parsed.u !== "string" ||
      typeof parsed.w !== "string" ||
      typeof parsed.p !== "string" ||
      typeof parsed.n !== "string" ||
      typeof parsed.e !== "number"
    ) {
      return null;
    }
    if (Date.now() > parsed.e) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function oauthStateSecretConfigured(): boolean {
  return stateSecret() !== null;
}

export function publicAppUrl(request: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (env) {
    return env;
  }
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return host ? `${proto}://${host}` : "";
}

export function callbackUrl(request: Request, definition: ConnectorDefinition): string {
  if (!definition.oauth) {
    return "";
  }
  return `${publicAppUrl(request)}${definition.oauth.callbackPath}`;
}

export function buildAuthorizeUrl(input: {
  request: Request;
  definition: ConnectorDefinition;
  state: string;
}): string | null {
  const { definition, state } = input;
  if (!definition.oauth || !oauthEnvConfigured(definition)) {
    return null;
  }
  const clientId = readEnvSecret(definition.envSecretNames[0] ?? "");
  if (!clientId) {
    return null;
  }
  const url = new URL(definition.oauth.authorizeUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl(input.request, definition));
  url.searchParams.set("state", state);
  if (definition.requiredScopes.length > 0) {
    url.searchParams.set("scope", definition.requiredScopes.join(" "));
  }
  if (definition.id === "slack") {
    url.searchParams.set("scope", definition.requiredScopes.join(","));
  }
  if (definition.oauth.extraAuthorizeParams) {
    for (const [key, value] of Object.entries(definition.oauth.extraAuthorizeParams)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

type TokenResult =
  | { ok: true; accessToken: string; refreshToken?: string; tokenType?: string; accountLabel?: string }
  | { ok: false; error: string };

async function parseTokenJson(payload: unknown, provider: ConnectorId): Promise<TokenResult> {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Token response was empty" };
  }
  const record = payload as Record<string, unknown>;
  if (provider === "slack") {
    if (record.ok !== true) {
      return {
        ok: false,
        error: typeof record.error === "string" ? record.error : "Slack OAuth failed",
      };
    }
    const accessToken =
      typeof record.access_token === "string" ? record.access_token : "";
    if (!accessToken) {
      return { ok: false, error: "Slack did not return an access token" };
    }
    const team =
      record.team && typeof record.team === "object"
        ? (record.team as { name?: unknown }).name
        : undefined;
    return {
      ok: true,
      accessToken,
      tokenType: typeof record.token_type === "string" ? record.token_type : "Bearer",
      accountLabel: typeof team === "string" ? team : undefined,
    };
  }

  const accessToken =
    typeof record.access_token === "string" ? record.access_token : "";
  if (!accessToken) {
    const error =
      typeof record.error_description === "string"
        ? record.error_description
        : typeof record.error === "string"
          ? record.error
          : "Provider did not return an access token";
    return { ok: false, error };
  }
  return {
    ok: true,
    accessToken,
    refreshToken:
      typeof record.refresh_token === "string" ? record.refresh_token : undefined,
    tokenType: typeof record.token_type === "string" ? record.token_type : "bearer",
  };
}

export async function exchangeOauthCode(input: {
  definition: ConnectorDefinition;
  code: string;
  request: Request;
}): Promise<TokenResult> {
  const { definition, code } = input;
  if (!definition.oauth || !oauthEnvConfigured(definition)) {
    return { ok: false, error: "OAuth is not configured for this connector" };
  }
  const clientId = readEnvSecret(definition.envSecretNames[0] ?? "");
  const clientSecret = readEnvSecret(definition.envSecretNames[1] ?? "");
  if (!clientId || !clientSecret) {
    return { ok: false, error: "OAuth client secrets are not configured" };
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: callbackUrl(input.request, definition),
    grant_type: "authorization_code",
  });

  const response = await fetch(definition.oauth.tokenUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    return {
      ok: false,
      error: `Token exchange failed (${response.status})`,
    };
  }
  return parseTokenJson(payload, definition.id);
}

export async function lookupOauthAccountLabel(input: {
  provider: ConnectorId;
  accessToken: string;
}): Promise<string | undefined> {
  try {
    if (input.provider === "github") {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          accept: "application/vnd.github+json",
          "user-agent": "agent-marketplace",
        },
      });
      if (!response.ok) {
        return undefined;
      }
      const user = (await response.json()) as { login?: unknown };
      return typeof user.login === "string" ? user.login : undefined;
    }
    if (input.provider === "vercel") {
      const response = await fetch("https://api.vercel.com/v2/user", {
        headers: { authorization: `Bearer ${input.accessToken}` },
      });
      if (!response.ok) {
        return undefined;
      }
      const body = (await response.json()) as { user?: { username?: unknown } };
      return typeof body.user?.username === "string" ? body.user.username : undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function oauthProviderOrNull(id: string): ConnectorDefinition | null {
  const definition = getConnector(id);
  if (!definition?.oauth) {
    return null;
  }
  return definition;
}
