import { and, desc, eq } from "drizzle-orm";
import { getDb, withUserRls } from "@/lib/db";
import {
  agentProfiles,
  rentalPayments,
  rentals,
  workspaces,
} from "@/lib/db/schema";
import type { AgentRentalDuration } from "@/lib/db/json";
import {
  STRIPE_NOT_CONFIGURED,
  createCheckoutSession,
  getOpenCheckoutUrl,
  isStripeConfigured,
} from "@/lib/stripe";
import { getVerifiedSession } from "@/lib/auth/server";

function pickDuration(
  durations: AgentRentalDuration[],
  durationId?: string,
): AgentRentalDuration | null {
  if (durations.length === 0) {
    return null;
  }
  if (durationId) {
    return durations.find((row) => row.id === durationId) ?? null;
  }
  return durations[0];
}

export async function ensurePersonalWorkspace(userId: string) {
  return withUserRls(userId, async (db) => {
    const [existing] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.ownerUserId, userId))
      .orderBy(desc(workspaces.createdAt))
      .limit(1);
    if (existing) {
      return existing;
    }
    const [created] = await db
      .insert(workspaces)
      .values({ ownerUserId: userId, name: "Personal" })
      .returning();
    return created;
  });
}

export function rentalIsActive(rental: {
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
}): boolean {
  if (rental.status !== "active") {
    return false;
  }
  const now = Date.now();
  if (rental.startsAt && rental.startsAt.getTime() > now) {
    return false;
  }
  if (rental.endsAt && rental.endsAt.getTime() < now) {
    return false;
  }
  return true;
}

export function serializeRental(
  rental: {
    id: string;
    userId: string;
    workspaceId: string;
    agentProfileId: string;
    status: string;
    startsAt: Date | null;
    endsAt: Date | null;
    stripeSessionId: string | null;
    stripePaymentIntentId: string | null;
    usageIncluded: number;
    usageConsumed: number;
    createdAt: Date;
  },
  extra: {
    agentSlug?: string;
    agentName?: string;
    agentTier?: string;
    checkoutUrl?: string;
    stripeSessionId?: string | null;
    notice?: string;
  } = {},
) {
  return {
    id: rental.id,
    userId: rental.userId,
    workspaceId: rental.workspaceId,
    agentProfileId: rental.agentProfileId,
    status: rental.status,
    startsAt: rental.startsAt?.toISOString() ?? null,
    endsAt: rental.endsAt?.toISOString() ?? null,
    stripeSessionId: extra.stripeSessionId ?? rental.stripeSessionId,
    stripePaymentIntentId: rental.stripePaymentIntentId,
    usageIncluded: rental.usageIncluded,
    usageConsumed: rental.usageConsumed,
    createdAt: rental.createdAt.toISOString(),
    active: rentalIsActive(rental),
    billing: "stripe" as const,
    agentSlug: extra.agentSlug,
    agentName: extra.agentName,
    agentTier: extra.agentTier,
    checkoutUrl: extra.checkoutUrl,
    notice: extra.notice,
  };
}

export async function listRentals(userId: string) {
  return withUserRls(userId, async (db) => {
    const rows = await db
      .select({
        rental: rentals,
        agentSlug: agentProfiles.slug,
        agentName: agentProfiles.name,
        agentTier: agentProfiles.tier,
      })
      .from(rentals)
      .innerJoin(agentProfiles, eq(rentals.agentProfileId, agentProfiles.id))
      .where(eq(rentals.userId, userId))
      .orderBy(desc(rentals.createdAt))
      .limit(50);
    return rows.map((row) =>
      serializeRental(row.rental, {
        agentSlug: row.agentSlug,
        agentName: row.agentName,
        agentTier: row.agentTier,
      }),
    );
  });
}

export async function getRentalForUser(userId: string, rentalId: string) {
  return withUserRls(userId, async (db) => {
    const [row] = await db
      .select({
        rental: rentals,
        agent: agentProfiles,
      })
      .from(rentals)
      .innerJoin(agentProfiles, eq(rentals.agentProfileId, agentProfiles.id))
      .where(and(eq(rentals.id, rentalId), eq(rentals.userId, userId)))
      .limit(1);
    return row ?? null;
  });
}

async function customerEmail(): Promise<string | null> {
  const session = await getVerifiedSession();
  return session?.user.email ?? null;
}

async function insertPaymentAndCheckout(input: {
  rentalId: string;
  kind: "purchase" | "renewal";
  duration: AgentRentalDuration;
  agentName: string;
  attachSessionToRental: boolean;
}) {
  const db = getDb();
  const [payment] = await db
    .insert(rentalPayments)
    .values({
      rentalId: input.rentalId,
      kind: input.kind,
      status: "open",
      durationId: input.duration.id,
      durationHours: input.duration.durationHours,
      usageIncluded: input.duration.usageIncluded,
      priceCents: input.duration.priceCents,
      currency: input.duration.currency,
    })
    .returning();

  const session = await createCheckoutSession({
    rentalId: input.rentalId,
    paymentId: payment.id,
    kind: input.kind,
    agentName: input.agentName,
    duration: input.duration,
    customerEmail: await customerEmail(),
  });

  await db
    .update(rentalPayments)
    .set({ stripeSessionId: session.id })
    .where(eq(rentalPayments.id, payment.id));

  if (input.attachSessionToRental) {
    await db
      .update(rentals)
      .set({ stripeSessionId: session.id })
      .where(eq(rentals.id, input.rentalId));
  }

  return { payment, checkoutUrl: session.url as string, stripeSessionId: session.id };
}

export async function createRentalCheckout(input: {
  userId: string;
  slug: string;
  durationId?: string;
}) {
  if (!isStripeConfigured()) {
    return { ok: false as const, error: STRIPE_NOT_CONFIGURED, status: 503 };
  }

  const slug = input.slug.trim();
  if (!slug) {
    return { ok: false as const, error: "slug is required", status: 400 };
  }

  const prepared = await withUserRls(input.userId, async (db) => {
    const [agent] = await db
      .select()
      .from(agentProfiles)
      .where(eq(agentProfiles.slug, slug))
      .limit(1);
    if (!agent) {
      return { ok: false as const, error: "Agent not found", status: 404 };
    }
    if (agent.availability === "unavailable") {
      return {
        ok: false as const,
        error: "This agent is marked unavailable.",
        status: 409,
      };
    }

    const duration = pickDuration(
      agent.rentalOptions?.durations ?? [],
      input.durationId,
    );
    if (!duration) {
      return {
        ok: false as const,
        error: input.durationId
          ? `Unknown duration "${input.durationId}"`
          : "This agent has no rental durations.",
        status: 400,
      };
    }
    if (duration.priceCents <= 0) {
      return {
        ok: false as const,
        error: "This duration has no payable price.",
        status: 400,
      };
    }

    let [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.ownerUserId, input.userId))
      .orderBy(desc(workspaces.createdAt))
      .limit(1);
    if (!workspace) {
      [workspace] = await db
        .insert(workspaces)
        .values({ ownerUserId: input.userId, name: "Personal" })
        .returning();
    }

    const [rental] = await db
      .insert(rentals)
      .values({
        userId: input.userId,
        workspaceId: workspace.id,
        agentProfileId: agent.id,
        status: "pending",
        startsAt: null,
        endsAt: null,
        stripeSessionId: null,
        stripePaymentIntentId: null,
        usageIncluded: 0,
        usageConsumed: 0,
      })
      .returning();

    return {
      ok: true as const,
      rental,
      agentName: agent.name,
      agentSlug: agent.slug,
      duration,
    };
  });

  if (!prepared.ok) {
    return prepared;
  }

  try {
    const checkout = await insertPaymentAndCheckout({
      rentalId: prepared.rental.id,
      kind: "purchase",
      duration: prepared.duration,
      agentName: prepared.agentName,
      attachSessionToRental: true,
    });
    return {
      ok: true as const,
      data: serializeRental(prepared.rental, {
        agentSlug: prepared.agentSlug,
        agentName: prepared.agentName,
        checkoutUrl: checkout.checkoutUrl,
        stripeSessionId: checkout.stripeSessionId,
        notice:
          "Rental stays pending until Stripe sends checkout.session.completed (or payment_intent.succeeded) to /api/webhooks/stripe.",
      }),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe Checkout failed";
    return { ok: false as const, error: message, status: 502 };
  }
}

export async function resumeRentalCheckout(input: {
  userId: string;
  rentalId: string;
}) {
  if (!isStripeConfigured()) {
    return { ok: false as const, error: STRIPE_NOT_CONFIGURED, status: 503 };
  }

  const row = await getRentalForUser(input.userId, input.rentalId);
  if (!row) {
    return { ok: false as const, error: "Rental not found", status: 404 };
  }
  if (row.rental.status !== "pending") {
    return {
      ok: false as const,
      error: "Only pending rentals can resume Checkout.",
      status: 409,
    };
  }

  const duration = pickDuration(row.agent.rentalOptions?.durations ?? []);
  if (!duration || duration.priceCents <= 0) {
    return {
      ok: false as const,
      error: "This agent has no payable rental duration.",
      status: 400,
    };
  }

  const db = getDb();
  const [openPayment] = await db
    .select()
    .from(rentalPayments)
    .where(
      and(
        eq(rentalPayments.rentalId, row.rental.id),
        eq(rentalPayments.kind, "purchase"),
        eq(rentalPayments.status, "open"),
      ),
    )
    .orderBy(desc(rentalPayments.createdAt))
    .limit(1);

  if (openPayment?.stripeSessionId) {
    const existingUrl = await getOpenCheckoutUrl(openPayment.stripeSessionId);
    if (existingUrl) {
      return {
        ok: true as const,
        data: serializeRental(row.rental, {
          agentSlug: row.agent.slug,
          agentName: row.agent.name,
          checkoutUrl: existingUrl,
        }),
      };
    }
  }

  try {
    const checkout = await insertPaymentAndCheckout({
      rentalId: row.rental.id,
      kind: "purchase",
      duration,
      agentName: row.agent.name,
      attachSessionToRental: true,
    });
    return {
      ok: true as const,
      data: serializeRental(row.rental, {
        agentSlug: row.agent.slug,
        agentName: row.agent.name,
        checkoutUrl: checkout.checkoutUrl,
        stripeSessionId: checkout.stripeSessionId,
      }),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe Checkout failed";
    return { ok: false as const, error: message, status: 502 };
  }
}

export async function renewRentalCheckout(input: {
  userId: string;
  rentalId: string;
  durationId?: string;
}) {
  if (!isStripeConfigured()) {
    return { ok: false as const, error: STRIPE_NOT_CONFIGURED, status: 503 };
  }

  const row = await getRentalForUser(input.userId, input.rentalId);
  if (!row) {
    return { ok: false as const, error: "Rental not found", status: 404 };
  }
  if (
    row.rental.status === "pending" ||
    row.rental.status === "canceled" ||
    row.rental.status === "refunded"
  ) {
    return {
      ok: false as const,
      error: "Only a previously paid rental can be renewed.",
      status: 409,
    };
  }

  const duration = pickDuration(
    row.agent.rentalOptions?.durations ?? [],
    input.durationId,
  );
  if (!duration || duration.priceCents <= 0) {
    return {
      ok: false as const,
      error: input.durationId
        ? `Unknown duration "${input.durationId}"`
        : "This agent has no payable rental duration.",
      status: 400,
    };
  }

  const db = getDb();
  const [openRenewal] = await db
    .select()
    .from(rentalPayments)
    .where(
      and(
        eq(rentalPayments.rentalId, row.rental.id),
        eq(rentalPayments.kind, "renewal"),
        eq(rentalPayments.status, "open"),
      ),
    )
    .orderBy(desc(rentalPayments.createdAt))
    .limit(1);

  if (openRenewal?.stripeSessionId) {
    const existingUrl = await getOpenCheckoutUrl(openRenewal.stripeSessionId);
    if (existingUrl) {
      return {
        ok: true as const,
        data: serializeRental(row.rental, {
          agentSlug: row.agent.slug,
          agentName: row.agent.name,
          checkoutUrl: existingUrl,
        }),
      };
    }
  }

  try {
    const checkout = await insertPaymentAndCheckout({
      rentalId: row.rental.id,
      kind: "renewal",
      duration,
      agentName: row.agent.name,
      attachSessionToRental: false,
    });
    return {
      ok: true as const,
      data: serializeRental(row.rental, {
        agentSlug: row.agent.slug,
        agentName: row.agent.name,
        checkoutUrl: checkout.checkoutUrl,
        stripeSessionId: checkout.stripeSessionId,
        notice:
          "ends_at and usage_included update only after the Stripe webhook confirms payment.",
      }),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe Checkout failed";
    return { ok: false as const, error: message, status: 502 };
  }
}
