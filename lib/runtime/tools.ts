import type { ChatTool } from "@/lib/unorouter/types";
import {
  connectorCatalog,
  connectorToolsForGrants,
  executeConnectorTool,
  isConnectorToolName,
  listConnectorGrants,
  requestConnectorGrant,
} from "@/lib/connectors";
import { listMemories, writeMemory } from "./memory";
import type { RuntimeContext } from "./types";

export function runtimeTools(context: RuntimeContext): ChatTool[] {
  const tools: ChatTool[] = [
    {
      type: "function",
      function: {
        name: "memory_write",
        description:
          "Store a short note, fact, or preference. Use visibility=workspace so other concurrent rented agents in this workspace can read it. Default visibility=user is private to this renter. Isolated by Neon Auth user + workspace RLS; no global lock.",
        parameters: {
          type: "object",
          properties: {
            content: { type: "string" },
            kind: {
              type: "string",
              enum: ["note", "fact", "preference"],
            },
            visibility: {
              type: "string",
              enum: ["user", "workspace"],
            },
          },
          required: ["content"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "memory_search",
        description:
          "Read recent user-private and workspace-shared memories in this workspace (RLS-filtered).",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string" },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "list_connector_grants",
        description:
          "List first-party connectors (neon, github, slack, vercel, supabase, render, stripe, cursor, higgsfield, linkedin, meta, google-search) and this rental's grant status. Does not return secrets.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "request_connector_grant",
        description:
          "Request a first-party connector grant. Does not mark the grant active unless tenant credentials are provided. OAuth must complete in the browser.",
        parameters: {
          type: "object",
          properties: {
            provider: { type: "string" },
            scopes: { type: "array", items: { type: "string" } },
          },
          required: ["provider"],
        },
      },
    },
    ...connectorToolsForGrants(context.connectorGrants),
  ];

  return tools;
}

function asObject(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return { raw };
  }
  return { raw };
}

export async function executeRuntimeTool(
  context: RuntimeContext,
  name: string,
  argsJson: string,
): Promise<string> {
  const args = asObject(argsJson);
  switch (name) {
    case "memory_write": {
      const content = String(args.content ?? "").trim();
      const kindRaw = String(args.kind ?? "note");
      const kind =
        kindRaw === "fact" || kindRaw === "preference" ? kindRaw : "note";
      const visibility =
        String(args.visibility ?? "user") === "workspace" ? "workspace" : "user";
      const result = await writeMemory({
        userId: context.userId,
        workspaceId: context.rental.workspaceId,
        sessionId: context.session.id,
        kind,
        visibility,
        content,
      });
      return JSON.stringify(result);
    }
    case "memory_search": {
      const query = String(args.query ?? "").toLowerCase();
      const rows = await listMemories(
        context.userId,
        context.rental.workspaceId,
        12,
      );
      const filtered = query
        ? rows.filter((row) => row.content.toLowerCase().includes(query))
        : rows;
      return JSON.stringify(
        filtered.map((row) => ({
          id: row.id,
          kind: row.kind,
          visibility: row.visibility,
          content: row.content,
          createdAt: row.createdAt.toISOString(),
        })),
      );
    }
    case "list_connector_grants": {
      const grants = await listConnectorGrants(
        context.userId,
        context.rental.workspaceId,
      );
      return JSON.stringify({
        catalog: connectorCatalog(grants).map((item) => ({
          id: item.id,
          displayName: item.displayName,
          capabilityTags: item.capabilityTags,
          oauthConfigured: item.oauthConfigured,
          grant: item.grant
            ? {
                status: item.grant.status,
                hasCredentials: item.grant.hasCredentials,
                scopes: item.grant.scopes,
              }
            : null,
        })),
        agentRequested: context.agent.connectors ?? [],
      });
    }
    case "request_connector_grant": {
      const result = await requestConnectorGrant({
        userId: context.userId,
        workspaceId: context.rental.workspaceId,
        rentalId: context.rental.id,
        provider: String(args.provider ?? ""),
        scopes: Array.isArray(args.scopes)
          ? args.scopes.map((scope) => String(scope))
          : [],
      });
      return JSON.stringify(result);
    }
    default:
      if (isConnectorToolName(name)) {
        return executeConnectorTool({
          userId: context.userId,
          workspaceId: context.rental.workspaceId,
          name,
        });
      }
      return JSON.stringify({
        error: `Unknown tool "${name}"`,
      });
  }
}
