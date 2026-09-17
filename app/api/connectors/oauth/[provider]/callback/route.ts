import { NextResponse } from "next/server";
import { getVerifiedUserId } from "@/lib/auth/server";
import {
  activateOauthGrant,
  getConnector,
} from "@/lib/connectors";
import {
  decodeOauthState,
  exchangeOauthCode,
  lookupOauthAccountLabel,
  oauthProviderOrNull,
} from "@/lib/connectors/oauth";

export const dynamic = "force-dynamic";

function redirectToConnectors(request: Request, query: Record<string, string>) {
  const origin = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  const url = new URL("/connectors", origin || request.url);
  for (const [key, value] of Object.entries(query)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  return NextResponse.redirect(url);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  const definition = oauthProviderOrNull(provider);
  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim() ?? "";
  const stateRaw = url.searchParams.get("state")?.trim() ?? "";
  const oauthError = url.searchParams.get("error")?.trim();

  if (!definition) {
    return redirectToConnectors(request, {
      error: "Unknown OAuth connector",
    });
  }
  if (oauthError) {
    return redirectToConnectors(request, {
      error: oauthError,
      provider: definition.id,
    });
  }

  const state = decodeOauthState(stateRaw);
  if (!state || state.p !== definition.id) {
    return redirectToConnectors(request, {
      error: "Invalid or expired OAuth state",
      provider: definition.id,
    });
  }

  const userId = await getVerifiedUserId();
  if (!userId || userId !== state.u) {
    return redirectToConnectors(request, {
      error: "Sign in with the same account that started the connector grant",
      provider: definition.id,
      rentalId: state.r ?? "",
    });
  }

  if (!code) {
    return redirectToConnectors(request, {
      error: "OAuth callback missing code",
      provider: definition.id,
      rentalId: state.r ?? "",
    });
  }

  const tokens = await exchangeOauthCode({
    definition,
    code,
    request,
  });
  if (!tokens.ok) {
    return redirectToConnectors(request, {
      error: tokens.error,
      provider: definition.id,
      rentalId: state.r ?? "",
    });
  }

  const accountLabel =
    tokens.accountLabel ??
    (await lookupOauthAccountLabel({
      provider: definition.id,
      accessToken: tokens.accessToken,
    }));

  const catalog = getConnector(definition.id);
  await activateOauthGrant({
    userId,
    workspaceId: state.w,
    provider: definition.id,
    scopes: catalog?.requiredScopes ?? [],
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    tokenType: tokens.tokenType,
    accountLabel,
  });

  return redirectToConnectors(request, {
    connected: definition.id,
    rentalId: state.r ?? "",
  });
}
