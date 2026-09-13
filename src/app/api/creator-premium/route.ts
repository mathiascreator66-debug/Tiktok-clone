import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authRateLimit } from "@/lib/rate-limit";
import { isPaymentProvider } from "@/lib/payments";
import { demoCheckout } from "@/lib/payments-server";
import { subscribeToCreator } from "@/lib/wallet";

/** GET ?username=xxx — plan + statut d'abonnement du viewer */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const username = req.nextUrl.searchParams.get("username")?.toLowerCase().trim();
    if (!username) {
      return NextResponse.json({ error: "username requis." }, { status: 400 });
    }
    const creator = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        creatorPlan: true,
      },
    });
    if (!creator) {
      return NextResponse.json({ error: "Créateur introuvable." }, { status: 404 });
    }

    let subscription: {
      status: string;
      until: string;
      active: boolean;
    } | null = null;
    if (session) {
      const sub = await prisma.creatorSubscriber.findUnique({
        where: {
          fanId_creatorId: { fanId: session.id, creatorId: creator.id },
        },
      });
      if (sub) {
        const active = sub.status === "ACTIVE" && sub.until.getTime() > Date.now();
        subscription = {
          status: active ? "ACTIVE" : sub.status,
          until: sub.until.toISOString(),
          active,
        };
      }
    }

    return NextResponse.json({
      creatorId: creator.id,
      username: creator.username,
      plan: creator.creatorPlan
        ? {
            id: creator.creatorPlan.id,
            priceCents: creator.creatorPlan.priceCents,
            perks: creator.creatorPlan.perks,
            active: creator.creatorPlan.active,
          }
        : null,
      subscription,
      clarifications: {
        verifiedBadge: "Badge certifié (isVerified) — distinction plateforme",
        afrivoixPro: "AfriVoix Pro — abonnement plateforme (badge Pro, analytics)",
        creatorPremium: "Abonnement Premium fan → créateur — accès contenu exclusif",
      },
      demo: true,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

/** POST — actions: upsert_plan | subscribe | deactivate_plan */
export async function POST(req: NextRequest) {
  try {
    const limited = authRateLimit(req, "creator-premium");
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Trop de requêtes. Réessayez dans ${limited.retryAfterSec}s.` },
        { status: 429 }
      );
    }
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "upsert_plan") {
      const priceCents = Number(body.priceCents);
      const perks =
        typeof body.perks === "string" ? body.perks.trim().slice(0, 1000) : "";
      const active = body.active !== false;
      if (!Number.isFinite(priceCents) || priceCents < 100 || priceCents > 50_000) {
        return NextResponse.json(
          { error: "Prix invalide (1,00 € – 500,00 € démo)." },
          { status: 400 }
        );
      }
      const plan = await prisma.creatorSubscriptionPlan.upsert({
        where: { creatorId: session.id },
        create: {
          creatorId: session.id,
          priceCents: Math.round(priceCents),
          perks: perks || "Contenu exclusif pour abonnés Premium",
          active,
        },
        update: {
          priceCents: Math.round(priceCents),
          perks: perks || undefined,
          active,
        },
      });
      return NextResponse.json({
        ok: true,
        plan: {
          id: plan.id,
          priceCents: plan.priceCents,
          perks: plan.perks,
          active: plan.active,
        },
        note: "Offre Premium créateur (≠ badge certifié ≠ AfriVoix Pro).",
      });
    }

    if (action === "deactivate_plan") {
      await prisma.creatorSubscriptionPlan.updateMany({
        where: { creatorId: session.id },
        data: { active: false },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "subscribe") {
      const creatorUsername =
        typeof body.username === "string" ? body.username.toLowerCase().trim() : "";
      if (!creatorUsername) {
        return NextResponse.json({ error: "Créateur requis." }, { status: 400 });
      }
      const creator = await prisma.user.findUnique({
        where: { username: creatorUsername },
        select: { id: true, creatorPlan: true },
      });
      if (!creator?.creatorPlan?.active) {
        return NextResponse.json(
          { error: "Ce créateur n'a pas d'offre Premium active." },
          { status: 400 }
        );
      }
      const payWith = String(body.provider || "WALLET").toUpperCase();
      const userPaymentMethodId =
        typeof body.userPaymentMethodId === "string" ? body.userPaymentMethodId : null;

      try {
        if (payWith !== "WALLET" && isPaymentProvider(payWith)) {
          await demoCheckout({
            userId: session.id,
            amountCents: creator.creatorPlan.priceCents,
            provider: payWith,
            userPaymentMethodId,
            purpose: "creator_sub",
          });
        }
        const result = await subscribeToCreator({
          fanId: session.id,
          creatorId: creator.id,
          provider: payWith === "WALLET" ? "WALLET" : payWith,
        });
        return NextResponse.json({
          ok: true,
          balanceCents: result.balanceCents,
          until: result.until.toISOString(),
          demo: true,
          note: "Abonnement Premium créateur activé (démo). ≠ AfriVoix Pro ≠ badge certifié.",
        });
      } catch (err) {
        const code = err instanceof Error ? err.message : "";
        if (code === "SELF_SUB") {
          return NextResponse.json(
            { error: "Vous ne pouvez pas vous abonner à vous-même." },
            { status: 400 }
          );
        }
        if (code === "INSUFFICIENT") {
          return NextResponse.json(
            {
              error:
                "Solde insuffisant. Rechargez (démo) ou payez via MoMo / PayPal / crypto (démo).",
            },
            { status: 400 }
          );
        }
        if (code === "NO_PLAN") {
          return NextResponse.json({ error: "Offre indisponible." }, { status: 400 });
        }
        throw err;
      }
    }

    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
