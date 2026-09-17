import { requireApiUser } from "@/lib/api/guard";
import { listNetworkSummaries, serializeNetworkNode } from "@/lib/runtime/network";
import { ensurePersonalWorkspace } from "@/lib/runtime/rentals";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }
  const url = new URL(request.url);
  const workspaceId =
    url.searchParams.get("workspaceId")?.trim() ||
    (await ensurePersonalWorkspace(auth.userId)).id;
  const mesh = await listNetworkSummaries(auth.userId, workspaceId);
  return Response.json({
    workspaceId,
    workspaceScoped: true,
    crossTenant: false,
    nodes: mesh.nodes.map(serializeNetworkNode),
    edges: mesh.edges,
  });
}
