import { prisma } from "./prisma";
import {
  DEFAULT_COUNTRY_PROVIDERS,
  GLOBAL_COUNTRY,
  isPaymentProvider,
  type PaymentProvider,
  PROVIDER_LABELS,
} from "./payments";

export type AvailableMethod = {
  provider: PaymentProvider;
  label: string;
  currency: string;
  countryCode: string;
  enabled: boolean;
  configId?: string;
  metadata?: Record<string, unknown> | null;
};

function parseMeta(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Méthodes disponibles pour un pays : configs DB enabled pour le pays + global (*).
 * Fallback sur DEFAULT_COUNTRY_PROVIDERS si aucune ligne en base.
 */
export async function getAvailableMethodsForCountry(
  countryCode: string | null | undefined
): Promise<AvailableMethod[]> {
  const cc = (countryCode || "").toUpperCase().trim() || null;
  const codes = cc ? [cc, GLOBAL_COUNTRY] : [GLOBAL_COUNTRY];

  const rows = await prisma.paymentMethodConfig.findMany({
    where: { countryCode: { in: codes }, enabled: true },
    orderBy: [{ countryCode: "asc" }, { provider: "asc" }],
  });

  const byProvider = new Map<PaymentProvider, AvailableMethod>();

  for (const row of rows) {
    if (!isPaymentProvider(row.provider)) continue;
    // Prefer country-specific over global when both exist
    const existing = byProvider.get(row.provider);
    if (existing && existing.countryCode !== GLOBAL_COUNTRY && row.countryCode === GLOBAL_COUNTRY) {
      continue;
    }
    byProvider.set(row.provider, {
      provider: row.provider,
      label: PROVIDER_LABELS[row.provider],
      currency: row.currency,
      countryCode: row.countryCode,
      enabled: row.enabled,
      configId: row.id,
      metadata: parseMeta(row.metadata),
    });
  }

  if (byProvider.size === 0) {
    const local = cc ? DEFAULT_COUNTRY_PROVIDERS[cc] || [] : [];
    const global = DEFAULT_COUNTRY_PROVIDERS[GLOBAL_COUNTRY] || [];
    for (const item of [...local, ...global]) {
      if (byProvider.has(item.provider)) continue;
      byProvider.set(item.provider, {
        provider: item.provider,
        label: PROVIDER_LABELS[item.provider],
        currency: item.currency,
        countryCode: local.some((l) => l.provider === item.provider) && cc ? cc : GLOBAL_COUNTRY,
        enabled: true,
      });
    }
  } else {
    // Always ensure global PayPal/Crypto if enabled in DB or as fallback
    const globalDefaults = DEFAULT_COUNTRY_PROVIDERS[GLOBAL_COUNTRY] || [];
    for (const g of globalDefaults) {
      if (byProvider.has(g.provider)) continue;
      const cfg = await prisma.paymentMethodConfig.findUnique({
        where: {
          countryCode_provider: { countryCode: GLOBAL_COUNTRY, provider: g.provider },
        },
      });
      if (cfg && !cfg.enabled) continue;
      if (!cfg) {
        byProvider.set(g.provider, {
          provider: g.provider,
          label: PROVIDER_LABELS[g.provider],
          currency: g.currency,
          countryCode: GLOBAL_COUNTRY,
          enabled: true,
        });
      }
    }
  }

  return Array.from(byProvider.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "fr")
  );
}

/**
 * Crédit démo via un provider (sandbox). Ne déplace aucun argent réel.
 */
export async function demoCheckout(opts: {
  userId: string;
  amountCents: number;
  provider: PaymentProvider;
  userPaymentMethodId?: string | null;
  purpose?: string;
}) {
  const { userId, amountCents, provider, userPaymentMethodId, purpose } = opts;
  if (!Number.isFinite(amountCents) || amountCents < 50 || amountCents > 100_000) {
    throw new Error("INVALID_AMOUNT");
  }
  if (!isPaymentProvider(provider)) throw new Error("INVALID_PROVIDER");

  let methodSnap: Record<string, unknown> | null = null;
  if (userPaymentMethodId) {
    const m = await prisma.userPaymentMethod.findFirst({
      where: { id: userPaymentMethodId, userId },
    });
    if (!m) throw new Error("METHOD_NOT_FOUND");
    if (m.provider !== provider) throw new Error("PROVIDER_MISMATCH");
    methodSnap = {
      id: m.id,
      label: m.label,
      phoneE164: m.phoneE164,
      email: m.email,
      walletAddress: m.walletAddress,
    };
  }

  return prisma.$transaction(async (tx) => {
    // PENDING then COMPLETED — structure prête pour vrais webhooks
    const pending = await tx.transaction.create({
      data: {
        userId,
        type: "credit",
        amountCents,
        provider,
        status: "PENDING",
        meta: JSON.stringify({
          demo: true,
          note: `Paiement démo via ${PROVIDER_LABELS[provider]} — aucun argent réel`,
          source: "demo_checkout",
          purpose: purpose ?? "topup",
          userPaymentMethod: methodSnap,
        }),
      },
    });

    const user = await tx.user.update({
      where: { id: userId },
      data: { balanceCents: { increment: amountCents } },
      select: { balanceCents: true },
    });

    const completed = await tx.transaction.update({
      where: { id: pending.id },
      data: { status: "COMPLETED" },
    });

    return {
      balanceCents: user.balanceCents,
      transaction: completed,
      demo: true as const,
      note: "Démo — crédits virtuels. Aucun paiement réel n'a été effectué.",
    };
  });
}
