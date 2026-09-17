import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AgentProfile } from "@/components/agent/agent-profile";
import { PageShell } from "@/components/page-shell";
import { getVerifiedSession } from "@/lib/auth/server";
import { parseCompareSlugs } from "@/lib/catalog/compare-params";
import { getAgentBySlug, isDatabaseConfigured } from "@/lib/catalog/queries";
import { firstSearchParam } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/agents/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (!isDatabaseConfigured()) {
    return { title: "Agent" };
  }
  const agent = await getAgentBySlug(slug);
  return {
    title: agent?.name ?? "Agent nicht gefunden",
    description: agent?.tagline ?? agent?.description,
  };
}

export default async function AgentPage({
  params,
  searchParams,
}: PageProps<"/agents/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const session = await getVerifiedSession();

  if (!isDatabaseConfigured()) {
    return (
      <PageShell
        title="Agent"
        description="Katalogdatenbank ist auf diesem Server nicht konfiguriert."
      >
        <p className="text-sm">
          Slug: <code className="font-mono">{slug}</code>
        </p>
      </PageShell>
    );
  }

  const agent = await getAgentBySlug(slug);
  if (!agent) {
    notFound();
  }

  const durationId = firstSearchParam(query.duration);
  const compare = parseMarketplaceCompare(query);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <AgentProfile
        agent={agent}
        durationId={durationId}
        compare={compare}
        signedIn={Boolean(session?.user)}
      />
    </main>
  );
}
