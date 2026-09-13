import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { authRateLimit } from "@/lib/rate-limit";
import { isPaymentProvider } from "@/lib/payments";
import { demoCheckout } from "@/lib/payments-server";

export async function POST(req: NextRequest) {
  try {
    const limited = authRateLimit(req, "demo-checkout");
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Trop de tentatives. Réessayez dans ${limited.retryAfterSec}s.` },
        { status: 429 }
      );
    }
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const amountCents = Number(body.amountCents);
    const provider = String(body.provider || "").toUpperCase();
    const userPaymentMethodId =
      typeof body.userPaymentMethodId === "string" ? body.userPaymentMethodId : null;
    const purpose = typeof body.purpose === "string" ? body.purpose : "topup";

    if (!isPaymentProvider(provider)) {
      return NextResponse.json({ error: "Fournisseur invalide." }, { status: 400 });
    }

    try {
      const result = await demoCheckout({
        userId: session.id,
        amountCents,
        provider,
        userPaymentMethodId,
        purpose,
      });
      return NextResponse.json({
        ok: true,
        balanceCents: result.balanceCents,
        creditedCents: amountCents,
        provider,
        transactionId: result.transaction.id,
        demo: true,
        note: result.note,
      });
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "INVALID_AMOUNT") {
        return NextResponse.json(
          { error: "Montant invalide (min. 0,50 € démo)." },
          { status: 400 }
        );
      }
      if (code === "METHOD_NOT_FOUND" || code === "PROVIDER_MISMATCH") {
        return NextResponse.json(
          { error: "Moyen de paiement enregistré introuvable." },
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
