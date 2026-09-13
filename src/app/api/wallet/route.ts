import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProActive } from "@/lib/wallet";

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
    const transactions = await prisma.transaction.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({
      balanceCents: user.balanceCents,
      isPro: isProActive(user),
      proUntil: user.proUntil?.toISOString() ?? null,
      proTrialUsed: user.proTrialUsed,
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amountCents: t.amountCents,
        provider: t.provider,
        status: t.status,
        meta: t.meta ? safeJson(t.meta) : null,
        createdAt: t.createdAt.toISOString(),
      })),
      demo: true,
      note: "Démo — crédits virtuels. Aucun paiement réel.",
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
