import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { authRateLimit } from "@/lib/rate-limit";
import { safeError } from "@/lib/safe-log";

export async function POST(req: NextRequest) {
  try {
    const limited = authRateLimit(req, "help");
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Trop de demandes. Réessayez dans ${limited.retryAfterSec}s.` },
        { status: 429 }
      );
    }
    const session = await getSession();
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const subject = String(body.subject || "").trim().slice(0, 120);
    const message = String(body.message || "").trim().slice(0, 4000);

    if (!email || !email.includes("@") || !subject || message.length < 10) {
      return NextResponse.json(
        { error: "Email, sujet et message (10+ caractères) requis." },
        { status: 400 }
      );
    }

    const ticket = await prisma.helpTicket.create({
      data: {
        email,
        subject,
        message,
        userId: session?.id ?? null,
        status: "open",
      },
    });

    return NextResponse.json({ ok: true, id: ticket.id });
  } catch (e) {
    safeError(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
