import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb, withUserRls } from "@/lib/db";
import {
  agentProfiles,
  agentRuns,
  agentSessions,
  rentalPayments,
  rentals,
  workspaces,
} from "@/lib/db/schema";
import { pruneGroupMembershipForRental } from "./rooms";
import type { AgentRentalDuration } from "@/lib/db/json";
import { ensurePendingConnectorGrantsForRental } from "@/lib/connectors";
import {
  STRIPE_NOT_CONFIGURED,
  createCheckoutSession,
  expireOpenCheckoutSession,
  getOpenCheckoutUrl,
  isStripeConfigured,
  purchaseWindow,
} from "@/lib/stripe";
import { getVerifiedSession } from "@/lib/auth/server";
import { rentalEndTransition, rentalIsActive } from "./rental-status";
import {
  UNPAID_TEST_BILLING,
  UNPAID_TEST_NOTICE,
  inferRentalBilling,
  resolveRentalCreateMode,
  type RentalBilling,
} from "./unpaid-access";

export {
  cannotEndRentalMessage,
  rentalAccessError,
  rentalEndTransition,
  rentalIsActive,
  RENTAL_CONFLICT,
  RENTAL_ENDABLE_STATUSES,
} from "./rental-status";

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
    endedAt?: Date | null;
    endedByUserId?: string | null;
    endReason?: string | null;
  },
  extra: {
    agentSlug?: string;
    agentName?: string;
    agentTier?: string;
    agentCategory?: string;
    agentAccentColor?: string | null;
    checkoutUrl?: string | null;
    stripeSessionId?: string | null;
    billing?: RentalBilling;
    notice?: string;
  } = {},
) {
  const stripeSessionId = extra.stripeSessionId ?? rental.stripeSessionId;
  return {
    id: rental.id,
    userId: rental.userId,
    workspaceId: rental.workspaceId,
    agentProfileId: rental.agentProfileId,
    status: rental.status,
    startsAt: rental.startsAt?.toISOString() ?? null,
    endsAt: rental.endsAt?.toISOString() ?? null,
    stripeSessionId,
    stripePaymentIntentId: rental.stripePaymentIntentId,
    usageIncluded: rental.usageIncluded,
    usageConsumed: rental.usageConsumed,
    createdAt: rental.createdAt.toISOString(),
    endedAt: rental.endedAt?.toISOString() ?? null,
    endedByUserId: rental.endedByUserId ?? null,
    endReason: rental.endReason ?? null,
    active: rentalIsActive(rental),
    billing:
      extra.billing ??
      inferRentalBilling({
        stripeSessionId,
        stripePaymentIntentId: rental.stripePaymentIntentId,
        startsAt: rental.startsAt,
      }),
    agentSlug: extra.agentSlug,
    agentName: extra.agentName,
    agentTier: extra.agentTier,
    agentCategory: extra.agentCategory,
    agentAccentColor: extra.agentAccentColor,
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
        agentCategory: agentProfiles.category,
        agentAccentColor: agentProfiles.accentColor,
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
        agentCategory: row.agentCategory,
        agentAccentColor: row.agentAccentColor,
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
  const mode = resolveRentalCreateMode();
  if (!mode.ok) {
    return { ok: false as const, error: mode.error, status: mode.status };
  }

  const slug = input.slug.trim();
  if (!slug) {
    return { ok: false as const, error: "slug is required", status: 400 };
  }

  const unpaidTest = mode.billing === UNPAID_TEST_BILLING;

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

    const window = unpaidTest
      ? purchaseWindow(new Date(), duration.durationHours)
      : null;

    const [rental] = await db
      .insert(rentals)
      .values({
        userId: input.userId,
        workspaceId: workspace.id,
        agentProfileId: agent.id,
        status: unpaidTest ? "active" : "pending",
        startsAt: window?.startsAt ?? null,
        endsAt: window?.endsAt ?? null,
        stripeSessionId: null,
        stripePaymentIntentId: null,
        usageIncluded: window ? duration.usageIncluded : 0,
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

  if (unpaidTest) {
    try {
      await ensurePendingConnectorGrantsForRental(prepared.rental.id);
    } catch {
      // Same best-effort as the Stripe webhook path.
    }
    return {
      ok: true as const,
      data: serializeRental(prepared.rental, {
        agentSlug: prepared.agentSlug,
        agentName: prepared.agentName,
        billing: UNPAID_TEST_BILLING,
        checkoutUrl: null,
        stripeSessionId: null,
        notice: UNPAID_TEST_NOTICE,
      }),
    };
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

export async function endRental(input: {
  userId: string;
  rentalId: string;
  reason?: string;
}) {
  const reason = (input.reason?.trim() || "user_ended").slice(0, 120);

  const prepared = await withUserRls(input.userId, async (db) => {
    const [row] = await db
      .select({
        rental: rentals,
        agent: agentProfiles,
      })
      .from(rentals)
      .innerJoin(agentProfiles, eq(rentals.agentProfileId, agentProfiles.id))
      .where(and(eq(rentals.id, input.rentalId), eq(rentals.userId, input.userId)))
      .limit(1);

    if (!row) {
      return { ok: false as const, error: "Rental not found", status: 404 };
    }
    const transition = rentalEndTransition(row.rental.status);
    if (!transition.ok) {
      return {
        ok: false as const,
        error: transition.error,
        status: transition.status,
      };
    }

    const now = new Date();
    const endsAt =
      row.rental.endsAt && row.rental.endsAt.getTime() < now.getTime()
        ? row.rental.endsAt
        : now;

    const [updated] = await db
      .update(rentals)
      .set({
        status: transition.nextStatus,
        endsAt,
        endedAt: now,
        endedByUserId: input.userId,
        endReason: reason,
      })
      .where(and(eq(rentals.id, row.rental.id), eq(rentals.userId, input.userId)))
      .returning();

    const closedSessions = await db
      .update(agentSessions)
      .set({ status: "closed", closedAt: now })
      .where(
        and(
          eq(agentSessions.rentalId, row.rental.id),
          eq(agentSessions.status, "open"),
          eq(agentSessions.kind, "solo"),
        ),
      )
      .returning({ id: agentSessions.id });

    const pruned = await pruneGroupMembershipForRental(db, row.rental.id, now);
    closedSessions.push(
      ...pruned.closedSessionIds.map((id) => ({ id })),
    );

    const closedSessionIds = [
      ...new Set(closedSessions.map((session) => session.id)),
    ];

    const canceledFromClosed =
      closedSessionIds.length === 0
        ? []
        : await db
            .update(agentRuns)
            .set({
              status: "canceled",
              finishedAt: now,
              output: { canceled: true, reason: "rental_ended" },
            })
            .where(
              and(
                inArray(agentRuns.sessionId, closedSessionIds),
                inArray(agentRuns.status, ["queued", "running"]),
              ),
            )
            .returning({ id: agentRuns.id });

    let canceledFromOpenGroup: Array<{ id: string }> = [];
    if (pruned.remainingOpenSessionIds.length > 0) {
      const openRuns = await db
        .select({
          id: agentRuns.id,
          input: agentRuns.input,
        })
        .from(agentRuns)
        .where(
          and(
            inArray(agentRuns.sessionId, pruned.remainingOpenSessionIds),
            inArray(agentRuns.status, ["queued", "running"]),
          ),
        );
      const ids = openRuns
        .filter((run) => {
          const payload = run.input as { rentalId?: unknown } | null;
          return payload?.rentalId === row.rental.id;
        })
        .map((run) => run.id);
      if (ids.length > 0) {
        canceledFromOpenGroup = await db
          .update(agentRuns)
          .set({
            status: "canceled",
            finishedAt: now,
            output: { canceled: true, reason: "rental_ended" },
          })
          .where(inArray(agentRuns.id, ids))
          .returning({ id: agentRuns.id });
      }
    }

    const canceledRuns = [...canceledFromClosed, ...canceledFromOpenGroup];

    const openPayments = await db
      .update(rentalPayments)
      .set({ status: "canceled" })
      .where(
        and(
          eq(rentalPayments.rentalId, row.rental.id),
          eq(rentalPayments.status, "open"),
        ),
      )
      .returning({ stripeSessionId: rentalPayments.stripeSessionId });

    return {
      ok: true as const,
      rental: updated,
      agentSlug: row.agent.slug,
      agentName: row.agent.name,
      agentTier: row.agent.tier,
      closedSessions: new Set(closedSessions.map((session) => session.id)).size,
      canceledRuns: canceledRuns.length,
      openCheckoutIds: openPayments
        .map((payment) => payment.stripeSessionId)
        .filter((id): id is string => Boolean(id)),
    };
  });

  if (!prepared.ok) {
    return prepared;
  }

  let expiredCheckoutSessions = 0;
  if (isStripeConfigured()) {
    const results = await Promise.all(
      prepared.openCheckoutIds.map((sessionId) =>
        expireOpenCheckoutSession(sessionId),
      ),
    );
    expiredCheckoutSessions = results.filter(Boolean).length;
  }

  return {
    ok: true as const,
    data: {
      ...serializeRental(prepared.rental, {
        agentSlug: prepared.agentSlug,
        agentName: prepared.agentName,
        agentTier: prepared.agentTier,
      }),
      closedSessions: prepared.closedSessions,
      canceledRuns: prepared.canceledRuns,
      expiredCheckoutSessions,
    },
  };
}
