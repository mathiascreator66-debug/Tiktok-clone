import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTip, TIP_AMOUNTS_CENTS } from "@/lib/wallet";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const amountCents = Number(body.amountCents);
    const toUsername =
      typeof body.toUsername === "string" ? body.toUsername.toLowerCase().trim() : "";
    const videoId = typeof body.videoId === "string" ? body.videoId : undefined;

    if (!toUsername) {
      return NextResponse.json({ error: "Destinataire requis." }, { status: 400 });
    }
    if (!TIP_AMOUNTS_CENTS.includes(amountCents as (typeof TIP_AMOUNTS_CENTS)[number])) {
      return NextResponse.json(
        { error: "Montant invalide. Choisissez 0,50 €, 1 € ou 5 €." },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { username: toUsername },
      select: { id: true, username: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    if (videoId) {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { id: true, userId: true },
      });
      if (!video) {
        return NextResponse.json({ error: "Vidéo introuvable." }, { status: 404 });
      }
    }

    try {
      const result = await sendTip({
        fromUserId: session.id,
        toUserId: target.id,
        amountCents,
        videoId,
      });
      return NextResponse.json({
        ok: true,
        balanceCents: result.balanceCents,
        feeCents: result.feeCents,
        netCents: result.netCents,
        toUsername: target.username,
        demo: true,
        note: "Démo — crédits virtuels",
      });
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "SELF_TIP") {
        return NextResponse.json(
          { error: "Vous ne pouvez pas vous offrir un pourboire." },
          { status: 400 }
        );
      }
      if (code === "INSUFFICIENT") {
        return NextResponse.json(
          { error: "Solde insuffisant. Créditez votre portefeuille (démo)." },
          { status: 400 }
        );
      }
      if (code === "INVALID_AMOUNT") {
        return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
      }
      throw err;
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
