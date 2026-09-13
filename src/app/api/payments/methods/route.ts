import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAvailableMethodsForCountry } from "@/lib/payments-server";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { country: true, phoneCountry: true },
    });
    const country = user?.country || user?.phoneCountry || null;
    const methods = await getAvailableMethodsForCountry(country);
    return NextResponse.json({
      countryCode: country,
      methods,
      demo: true,
      note: "Démo — aucun paiement réel. Méthodes filtrées par pays.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
