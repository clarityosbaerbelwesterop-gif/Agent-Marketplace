import type { ChatTool } from "@/lib/unorouter/types";
import { listConnectorGrants, requestConnectorGrant } from "./connectors";
import { listMemories, writeMemory } from "./memory";
import type { RuntimeContext } from "./types";

export function runtimeTools(): ChatTool[] {
  const tools: ChatTool[] = [
    {
      type: "function",
      function: {
        name: "memory_write",
        description:
          "Store a short note, fact, or preference for this user in this workspace.",
        parameters: {
          type: "object",
          properties: {
            content: { type: "string" },
            kind: {
              type: "string",
              enum: ["note", "fact", "preference"],
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
        description: "Read recent memories for this user in this workspace.",
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
          "List connector tools available on this rental and whether the user has granted access.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "request_connector_grant",
        description:
          "Request a connector grant during this rental. OAuth is not wired; the grant is stored as pending.",
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
      const result = await writeMemory({
        userId: context.userId,
        workspaceId: context.rental.workspaceId,
        sessionId: context.session.id,
        kind,
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
        agentConnectors: context.agent.connectors ?? [],
        grants,
        oauth: "not_wired",
      });
    }
    case "request_connector_grant": {
      const result = await requestConnectorGrant({
        userId: context.userId,
        workspaceId: context.rental.workspaceId,
        provider: String(args.provider ?? ""),
        scopes: Array.isArray(args.scopes)
          ? args.scopes.map((scope) => String(scope))
          : [],
      });
      return JSON.stringify(result);
    }
    default:
      return JSON.stringify({
        error: `Unknown tool "${name}"`,
      });
  }
}
