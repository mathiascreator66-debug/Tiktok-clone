import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ageFromBirthdate, createSession, hashPassword } from "@/lib/auth";
import { authRateLimit } from "@/lib/rate-limit";
import { safeError } from "@/lib/safe-log";
import { MIN_AGE } from "@/lib/limits";
import { COUNTRIES } from "@/lib/countries";
import { normalizePhoneE164, looksLikeEmail } from "@/lib/phone";

const LANGS = new Set(["fr", "en", "zh"]);
const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));

export async function POST(req: NextRequest) {
  try {
    const limited = authRateLimit(req, "register");
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Trop de tentatives. Réessayez dans ${limited.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
      );
    }

    const body = await req.json();
    const emailRaw = String(body.email || "").trim().toLowerCase();
    const username = String(body.username || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");
    const password = String(body.password || "");
    const country = String(body.country || "").trim().toUpperCase();
    const language = String(body.language || "fr").trim().toLowerCase();
    const birthdateRaw = String(body.birthdate || "").trim();
    const acceptCgu = Boolean(body.acceptCgu);
    const phoneCountry = body.phoneCountry
      ? String(body.phoneCountry).trim().slice(0, 8)
      : null;
    const phoneFromBody = body.phoneE164
      ? normalizePhoneE164(String(body.phoneE164))
      : null;

    const email = emailRaw && looksLikeEmail(emailRaw) ? emailRaw : null;
    const phoneE164 = phoneFromBody;

    if (!username || password.length < 6) {
      return NextResponse.json(
        {
          error:
            "Nom d'utilisateur et mot de passe (6+ caractères) requis.",
        },
        { status: 400 }
      );
    }
    if (username.length < 3) {
      return NextResponse.json(
        { error: "Le nom d'utilisateur doit contenir au moins 3 caractères." },
        { status: 400 }
      );
    }

    // Exactly one of email or phone
    const hasEmail = Boolean(email);
    const hasPhone = Boolean(phoneE164);
    if (hasEmail === hasPhone) {
      return NextResponse.json(
        {
          error:
            "Choisissez soit un e-mail, soit un téléphone (pas les deux, pas aucun).",
        },
        { status: 400 }
      );
    }

    if (!acceptCgu) {
      return NextResponse.json(
        { error: "Vous devez accepter les CGU pour vous inscrire." },
        { status: 400 }
      );
    }
    if (!country || !COUNTRY_CODES.has(country)) {
      return NextResponse.json({ error: "Pays invalide." }, { status: 400 });
    }
    if (!LANGS.has(language)) {
      return NextResponse.json(
        { error: "Langue invalide (fr, en ou zh)." },
        { status: 400 }
      );
    }
    if (!birthdateRaw) {
      return NextResponse.json(
        { error: "Date de naissance requise (13 ans minimum)." },
        { status: 400 }
      );
    }
    const birthdate = new Date(birthdateRaw);
    if (Number.isNaN(birthdate.getTime())) {
      return NextResponse.json(
        { error: "Date de naissance invalide." },
        { status: 400 }
      );
    }
    if (ageFromBirthdate(birthdate) < MIN_AGE) {
      return NextResponse.json(
        { error: `Vous devez avoir au moins ${MIN_AGE} ans.` },
        { status: 400 }
      );
    }

    const orChecks: { email?: string; username?: string; phoneE164?: string }[] =
      [{ username }];
    if (email) orChecks.push({ email });
    if (phoneE164) orChecks.push({ phoneE164 });

    const existing = await prisma.user.findFirst({
      where: { OR: orChecks },
    });
    if (existing) {
      if (existing.username === username) {
        return NextResponse.json(
          { error: "Ce nom d'utilisateur est déjà pris." },
          { status: 409 }
        );
      }
      if (email && existing.email === email) {
        return NextResponse.json(
          { error: "Cet e-mail est déjà utilisé." },
          { status: 409 }
        );
      }
      if (phoneE164 && existing.phoneE164 === phoneE164) {
        return NextResponse.json(
          { error: "Ce numéro de téléphone est déjà utilisé." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Identifiant déjà utilisé." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        country,
        language,
        birthdate,
        phoneE164: phoneE164 || null,
        phoneCountry: phoneE164 ? phoneCountry || null : null,
        accountStatus: "ACTIVE",
      },
    });

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
        phoneE164: user.phoneE164,
      },
    });
  } catch (e) {
    safeError(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
