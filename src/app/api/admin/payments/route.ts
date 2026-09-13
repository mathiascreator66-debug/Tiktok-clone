import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPaymentProvider, PROVIDER_LABELS } from "@/lib/payments";

async function requireAdmin(): Promise<
  | { actor: { id: string }; error?: undefined }
  | { actor?: undefined; error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Connexion requise." }, { status: 401 }) };
  }
  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, isAdmin: true, accountStatus: true },
  });
  if (!actor || actor.accountStatus !== "ACTIVE" || !actor.isAdmin) {
    return { error: NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 }) };
  }
  return { actor: { id: actor.id } };
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const configs = await prisma.paymentMethodConfig.findMany({
      orderBy: [{ countryCode: "asc" }, { provider: "asc" }],
    });
    return NextResponse.json({
      configs: configs.map((c) => ({
        id: c.id,
        countryCode: c.countryCode,
        provider: c.provider,
        label: isPaymentProvider(c.provider) ? PROVIDER_LABELS[c.provider] : c.provider,
        enabled: c.enabled,
        currency: c.currency,
        metadata: c.metadata ? safeJson(c.metadata) : null,
        updatedAt: c.updatedAt.toISOString(),
      })),
      demo: true,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const body = await req.json().catch(() => ({}));
    const id = typeof body.id === "string" ? body.id : null;
    const countryCode = typeof body.countryCode === "string" ? body.countryCode.toUpperCase() : null;
    const provider = typeof body.provider === "string" ? body.provider.toUpperCase() : null;

    let config;
    if (id) {
      config = await prisma.paymentMethodConfig.findUnique({ where: { id } });
    } else if (countryCode && provider && isPaymentProvider(provider)) {
      config = await prisma.paymentMethodConfig.findUnique({
        where: { countryCode_provider: { countryCode, provider } },
      });
      if (!config) {
        config = await prisma.paymentMethodConfig.create({
          data: {
            countryCode,
            provider,
            enabled: body.enabled !== false,
            currency: typeof body.currency === "string" ? body.currency : "XOF",
          },
        });
      }
    }
    if (!config) {
      return NextResponse.json({ error: "Configuration introuvable." }, { status: 404 });
    }

    const data: { enabled?: boolean; currency?: string; metadata?: string | null } = {};
    if (typeof body.enabled === "boolean") data.enabled = body.enabled;
    if (typeof body.currency === "string" && body.currency.trim()) {
      data.currency = body.currency.trim().toUpperCase().slice(0, 8);
    }
    if (body.metadata !== undefined) {
      data.metadata =
        body.metadata === null
          ? null
          : typeof body.metadata === "string"
            ? body.metadata
            : JSON.stringify(body.metadata);
    }

    const updated = await prisma.paymentMethodConfig.update({
      where: { id: config.id },
      data,
    });

    await prisma.adminAction.create({
      data: {
        actorId: auth.actor.id,
        action: "payment_config_update",
        targetType: "PaymentMethodConfig",
        targetId: updated.id,
        meta: JSON.stringify({
          countryCode: updated.countryCode,
          provider: updated.provider,
          enabled: updated.enabled,
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      config: {
        id: updated.id,
        countryCode: updated.countryCode,
        provider: updated.provider,
        label: isPaymentProvider(updated.provider)
          ? PROVIDER_LABELS[updated.provider]
          : updated.provider,
        enabled: updated.enabled,
        currency: updated.currency,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

function safeJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return { raw: s };
  }
}
