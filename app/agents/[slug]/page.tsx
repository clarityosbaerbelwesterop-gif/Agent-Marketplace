import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { StartRentalCheckoutForm } from "@/components/start-rental-checkout-form";
import { getVerifiedSession } from "@/lib/auth/server";
import { getAgentBySlug, isDatabaseConfigured } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

type AgentPageProps = PageProps<"/agents/[slug]">;

export async function generateMetadata({
  params,
}: AgentPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isDatabaseConfigured()) {
    return { title: "Agent" };
  }
  const agent = await getAgentBySlug(slug);
  return { title: agent?.name ?? "Agent" };
}

export default async function AgentPage({ params }: AgentPageProps) {
  const { slug } = await params;
  const session = await getVerifiedSession();

  if (!isDatabaseConfigured()) {
    return (
      <PageShell
        title="Agent"
        description="Catalog database is not configured on this server."
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

  const durations = agent.rentalOptions.durations ?? [];

  return (
    <PageShell title={agent.name} description={agent.tagline ?? agent.description}>
      <dl className="grid max-w-xl gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Category</dt>
          <dd>{agent.category}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Tier</dt>
          <dd>{agent.tier}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Model alias</dt>
          <dd>{agent.modelAlias ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Skill package</dt>
          <dd className="font-mono text-xs">{agent.skillPackageVersion ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Rating status</dt>
          <dd>{agent.ratingStatus}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Availability</dt>
          <dd>{agent.availability}</dd>
        </div>
      </dl>

      <p className="max-w-2xl text-sm leading-relaxed">{agent.description}</p>

      {durations.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Rental options</h2>
          <ul className="text-sm text-muted">
            {durations.map((duration) => (
              <li key={duration.id}>
                {duration.label}: {(duration.priceCents / 100).toFixed(2)}{" "}
                {duration.currency} · {duration.usageIncluded.toLocaleString()}{" "}
                {agent.rentalOptions.usageUnit ?? "tokens"} included
              </li>
            ))}
          </ul>
          {session?.user ? (
            <StartRentalCheckoutForm
              slug={agent.slug}
              durations={durations.map((duration) => ({
                id: duration.id,
                label: duration.label,
              }))}
            />
          ) : (
            <p className="text-sm text-muted">
              <Link className="underline underline-offset-4" href="/login">
                Sign in
              </Link>{" "}
              to pay with Stripe Checkout.
            </p>
          )}
        </section>
      ) : null}

      {agent.skills.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Skill package</h2>
          {agent.skills.map((skill) => (
            <p key={skill.id} className="max-w-2xl text-sm leading-relaxed text-muted">
              <span className="font-mono text-xs text-foreground">
                {skill.slug}@{skill.version}
              </span>
              {" — "}
              {skill.instructions}
            </p>
          ))}
        </section>
      ) : null}
    </PageShell>
  );
}
