import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fieldsForProvider, isPaymentProvider, PROVIDER_LABELS } from "@/lib/payments";
import { looksLikeEmail, normalizePhoneE164 } from "@/lib/phone";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const methods = await prisma.userPaymentMethod.findMany({
      where: { userId: session.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({
      methods: methods.map((m) => ({
        id: m.id,
        provider: m.provider,
        label: m.label || (isPaymentProvider(m.provider) ? PROVIDER_LABELS[m.provider] : m.provider),
        phoneE164: m.phoneE164,
        email: m.email,
        walletAddress: m.walletAddress,
        isDefault: m.isDefault,
        createdAt: m.createdAt.toISOString(),
      })),
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
    const provider = String(body.provider || "").toUpperCase();
    if (!isPaymentProvider(provider)) {
      return NextResponse.json({ error: "Fournisseur invalide." }, { status: 400 });
    }
    const fields = fieldsForProvider(provider);
    let phoneE164: string | null = null;
    let email: string | null = null;
    let walletAddress: string | null = null;

    if (fields.phone) {
      phoneE164 = normalizePhoneE164(String(body.phoneE164 || body.phone || ""));
      if (!phoneE164) {
        return NextResponse.json(
          { error: "Numéro de téléphone Mobile Money invalide (format international)." },
          { status: 400 }
        );
      }
    }
    if (fields.email) {
      email = String(body.email || "").trim().toLowerCase();
      if (!looksLikeEmail(email)) {
        return NextResponse.json({ error: "E-mail PayPal invalide." }, { status: 400 });
      }
    }
    if (fields.wallet) {
      walletAddress = String(body.walletAddress || body.wallet || "").trim();
      if (walletAddress.length < 10 || walletAddress.length > 128) {
        return NextResponse.json(
          { error: "Adresse crypto invalide (BTC / USDT)." },
          { status: 400 }
        );
      }
    }

    const label =
      typeof body.label === "string" && body.label.trim()
        ? body.label.trim().slice(0, 60)
        : PROVIDER_LABELS[provider];
    const isDefault = Boolean(body.isDefault);

    if (isDefault) {
      await prisma.userPaymentMethod.updateMany({
        where: { userId: session.id },
        data: { isDefault: false },
      });
    }

    const created = await prisma.userPaymentMethod.create({
      data: {
        userId: session.id,
        provider,
        label,
        phoneE164,
        email,
        walletAddress,
        isDefault,
      },
    });

    return NextResponse.json({
      ok: true,
      method: {
        id: created.id,
        provider: created.provider,
        label: created.label,
        phoneE164: created.phoneE164,
        email: created.email,
        walletAddress: created.walletAddress,
        isDefault: created.isDefault,
        createdAt: created.createdAt.toISOString(),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json({ error: "Identifiant requis." }, { status: 400 });
    }
    const existing = await prisma.userPaymentMethod.findFirst({
      where: { id, userId: session.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Moyen introuvable." }, { status: 404 });
    }
    await prisma.userPaymentMethod.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
