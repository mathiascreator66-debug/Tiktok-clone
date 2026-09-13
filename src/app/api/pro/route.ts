import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activatePro, isProActive, PRO_COST_CENTS, PRO_TRIAL_DAYS } from "@/lib/wallet";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        balanceCents: true,
        isPro: true,
        proUntil: true,
        proTrialUsed: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }
    return NextResponse.json({
      isPro: isProActive(user),
      proUntil: user.proUntil?.toISOString() ?? null,
      proTrialUsed: user.proTrialUsed,
      balanceCents: user.balanceCents,
      costCents: PRO_COST_CENTS,
      trialDays: PRO_TRIAL_DAYS,
      demo: true,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const useTrial = Boolean(body.useTrial);

    try {
      const result = await activatePro({ userId: session.id, useTrial });
      return NextResponse.json({
        ok: true,
        isPro: result.isPro,
        proUntil: result.proUntil.toISOString(),
        balanceCents: result.balanceCents,
        trial: result.trial,
        demo: true,
        note: "Démo — crédits virtuels. Structure prête pour Stripe.",
      });
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "TRIAL_USED") {
        return NextResponse.json(
          { error: "Essai gratuit déjà utilisé. Passez Pro avec 3 € (démo)." },
          { status: 400 }
        );
      }
      if (code === "INSUFFICIENT") {
        return NextResponse.json(
          { error: "Solde insuffisant (3 € démo). Créditez votre portefeuille." },
          { status: 400 }
        );
      }
      throw err;
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
