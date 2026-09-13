import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { authRateLimit } from "@/lib/rate-limit";
import { safeError } from "@/lib/safe-log";
import {
  looksLikeEmail,
  looksLikePhone,
  normalizePhoneE164,
} from "@/lib/phone";

export async function POST(req: NextRequest) {
  try {
    const limited = authRateLimit(req, "login");
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Trop de tentatives. Réessayez dans ${limited.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
      );
    }

    const body = await req.json();
    const identifier = String(
      body.identifier || body.email || body.phoneE164 || ""
    ).trim();
    const password = String(body.password || "");

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Identifiant (e-mail ou téléphone) et mot de passe requis." },
        { status: 400 }
      );
    }

    let user = null;
    if (looksLikeEmail(identifier)) {
      user = await prisma.user.findUnique({
        where: { email: identifier.toLowerCase() },
      });
    } else if (looksLikePhone(identifier)) {
      const phone = normalizePhoneE164(identifier);
      if (phone) {
        user = await prisma.user.findUnique({ where: { phoneE164: phone } });
      }
    } else {
      // try email then phone
      user = await prisma.user.findUnique({
        where: { email: identifier.toLowerCase() },
      });
      if (!user) {
        const phone = normalizePhoneE164(identifier);
        if (phone) {
          user = await prisma.user.findUnique({ where: { phoneE164: phone } });
        }
      }
    }

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        {
          error: user?.googleId
            ? "Ce compte utilise Google. Cliquez sur « Continuer avec Google »."
            : "Identifiants incorrects.",
        },
        { status: 401 }
      );
    }

    if (!(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Identifiants incorrects." },
        { status: 401 }
      );
    }

    if (user.accountStatus === "SUSPENDED") {
      return NextResponse.json(
        { error: "Compte suspendu. Contactez le support AfriVoix." },
        { status: 403 }
      );
    }
    if (user.accountStatus === "BANNED") {
      return NextResponse.json(
        { error: "Compte banni. Connexion impossible." },
        { status: 403 }
      );
    }
    if (user.accountStatus !== "ACTIVE") {
      return NextResponse.json(
        { error: "Compte non actif." },
        { status: 403 }
      );
    }

    await createSession({
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        displayName: user.displayName,
        bio: user.bio,
        phoneE164: user.phoneE164,
      },
    });
  } catch (e) {
    safeError(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
