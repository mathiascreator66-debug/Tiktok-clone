import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { BOOST_COST_CENTS, boostVideo } from "@/lib/wallet";

type Ctx = { params: { id: string } };

export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    try {
      const result = await boostVideo({
        userId: session.id,
        videoId: params.id,
      });
      return NextResponse.json({
        ok: true,
        balanceCents: result.balanceCents,
        boostedUntil: result.boostedUntil?.toISOString() ?? null,
        costCents: BOOST_COST_CENTS,
        demo: true,
        note: "Démo — crédits virtuels · boost 24 h",
      });
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "NOT_FOUND") {
        return NextResponse.json({ error: "Vidéo introuvable." }, { status: 404 });
      }
      if (code === "FORBIDDEN") {
        return NextResponse.json(
          { error: "Seul le propriétaire peut booster cette vidéo." },
          { status: 403 }
        );
      }
      if (code === "INSUFFICIENT") {
        return NextResponse.json(
          { error: "Solde insuffisant (2 € démo requis)." },
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
