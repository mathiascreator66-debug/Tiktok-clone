import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { creditDemo, DEMO_CREDIT_CENTS } from "@/lib/wallet";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const result = await creditDemo(session.id, DEMO_CREDIT_CENTS);
    return NextResponse.json({
      ok: true,
      balanceCents: result.balanceCents,
      creditedCents: DEMO_CREDIT_CENTS,
      demo: true,
      note: "Démo — crédits virtuels. Pas d'argent réel.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
