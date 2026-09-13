import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { authRateLimit } from "@/lib/rate-limit";
import { safeError } from "@/lib/safe-log";

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
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
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
      },
    });
  } catch (e) {
    safeError(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
