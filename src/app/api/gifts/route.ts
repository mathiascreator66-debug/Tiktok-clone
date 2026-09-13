import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { authRateLimit } from "@/lib/rate-limit";
import { GIFT_CATALOG } from "@/lib/gifts";
import { sendVideoGift } from "@/lib/wallet";
import { demoCheckout } from "@/lib/payments-server";
import { isPaymentProvider } from "@/lib/payments";
import { getGiftById } from "@/lib/gifts";

export async function GET() {
  return NextResponse.json({
    gifts: GIFT_CATALOG,
    demo: true,
    note: "Catalogue cadeaux — crédits virtuels. Distinct des pourboires (montants libres).",
  });
}

export async function POST(req: NextRequest) {
  try {
    const limited = authRateLimit(req, "gifts");
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Trop de cadeaux. Réessayez dans ${limited.retryAfterSec}s.` },
        { status: 429 }
      );
    }
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const giftId = String(body.giftId || "");
    const videoId = String(body.videoId || "");
    const payWith = String(body.provider || "WALLET").toUpperCase();
    const userPaymentMethodId =
      typeof body.userPaymentMethodId === "string" ? body.userPaymentMethodId : null;

    if (!videoId || !giftId) {
      return NextResponse.json({ error: "Cadeau et vidéo requis." }, { status: 400 });
    }
    const gift = getGiftById(giftId);
    if (!gift) {
      return NextResponse.json({ error: "Cadeau inconnu." }, { status: 400 });
    }

    try {
      // Optionnel : payer via MoMo/PayPal/crypto démo → crédit puis envoi
      if (payWith !== "WALLET" && isPaymentProvider(payWith)) {
        await demoCheckout({
          userId: session.id,
          amountCents: gift.priceCents,
          provider: payWith,
          userPaymentMethodId,
          purpose: "gift",
        });
      }

      const result = await sendVideoGift({
        fromUserId: session.id,
        videoId,
        giftId,
        provider: payWith === "WALLET" ? "WALLET" : payWith,
      });

      return NextResponse.json({
        ok: true,
        balanceCents: result.balanceCents,
        gift: result.gift,
        feeCents: result.feeCents,
        netCents: result.netCents,
        demo: true,
        note: "Démo — cadeau virtuel. Aucun argent réel.",
      });
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "SELF_GIFT") {
        return NextResponse.json(
          { error: "Vous ne pouvez pas vous offrir un cadeau." },
          { status: 400 }
        );
      }
      if (code === "INSUFFICIENT") {
        return NextResponse.json(
          {
            error:
              "Solde insuffisant. Rechargez via Solde (démo) ou choisissez un moyen de paiement démo.",
          },
          { status: 400 }
        );
      }
      if (code === "NOT_FOUND") {
        return NextResponse.json({ error: "Vidéo introuvable." }, { status: 404 });
      }
      if (code === "INVALID_GIFT") {
        return NextResponse.json({ error: "Cadeau invalide." }, { status: 400 });
      }
      throw err;
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
