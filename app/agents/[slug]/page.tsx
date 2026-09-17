import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Agent",
};

export default async function AgentPage({
  params,
}: PageProps<"/agents/[slug]">) {
  const { slug } = await params;

  return (
    <PageShell
      title="Agent"
      description="Agent profile, rental terms, and start-chat actions will land here. This page only reads the slug from the URL."
    >
      <p className="text-sm">
        Slug: <code className="font-mono">{slug}</code>
      </p>
    </PageShell>
  );
}
