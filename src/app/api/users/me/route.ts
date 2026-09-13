import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, getSession } from "@/lib/auth";
import { BIO_MAX_LENGTH, MAX_PROFILE_LINKS } from "@/lib/limits";
import { normalizePhoneE164 } from "@/lib/phone";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }

    const body = await req.json();
    const data: {
      bio?: string | null;
      displayName?: string | null;
      username?: string;
      avatarUrl?: string | null;
      phoneE164?: string | null;
      phoneCountry?: string | null;
    } = {};

    if ("bio" in body) {
      const bio = body.bio == null ? null : String(body.bio).trim();
      if (bio && bio.length > BIO_MAX_LENGTH) {
        return NextResponse.json(
          { error: `La bio est limitée à ${BIO_MAX_LENGTH} caractères.` },
          { status: 400 }
        );
      }
      data.bio = bio || null;
    }

    if ("displayName" in body) {
      const displayName =
        body.displayName == null ? null : String(body.displayName).trim();
      if (displayName && displayName.length > 50) {
        return NextResponse.json(
          { error: "Le nom d'affichage est limité à 50 caractères." },
          { status: 400 }
        );
      }
      data.displayName = displayName || null;
    }

    if ("avatarUrl" in body) {
      const avatarUrl =
        body.avatarUrl == null ? null : String(body.avatarUrl).trim();
      if (avatarUrl) {
        const isLocal = avatarUrl.startsWith("/uploads/");
        if (!isLocal) {
          try {
            const u = new URL(avatarUrl);
            if (u.protocol !== "http:" && u.protocol !== "https:") {
              return NextResponse.json(
                { error: "URL d'avatar invalide." },
                { status: 400 }
              );
            }
          } catch {
            return NextResponse.json(
              { error: "URL d'avatar invalide." },
              { status: 400 }
            );
          }
        }
      }
      data.avatarUrl = avatarUrl || null;
    }

    if ("username" in body && body.username != null) {
      const username = String(body.username)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "");
      if (username.length < 3) {
        return NextResponse.json(
          { error: "Le nom d'utilisateur doit contenir au moins 3 caractères." },
          { status: 400 }
        );
      }
      if (username !== session.username) {
        const taken = await prisma.user.findUnique({ where: { username } });
        if (taken) {
          return NextResponse.json(
            { error: "Ce nom d'utilisateur est déjà pris." },
            { status: 409 }
          );
        }
        data.username = username;
      }
    }


    if ("phoneE164" in body) {
      const raw = body.phoneE164 == null ? "" : String(body.phoneE164).trim();
      if (!raw) {
        data.phoneE164 = null;
        data.phoneCountry = null;
      } else {
        const phone = normalizePhoneE164(raw);
        if (!phone) {
          return NextResponse.json(
            { error: "Numéro de téléphone invalide." },
            { status: 400 }
          );
        }
        const taken = await prisma.user.findFirst({
          where: { phoneE164: phone, NOT: { id: session.id } },
        });
        if (taken) {
          return NextResponse.json(
            { error: "Ce numéro est déjà utilisé." },
            { status: 409 }
          );
        }
        data.phoneE164 = phone;
        if (body.phoneCountry) {
          data.phoneCountry = String(body.phoneCountry).trim().slice(0, 8);
        }
      }
    }
    let linksPayload: { url: string; label: string | null }[] | null = null;
    if ("links" in body) {
      if (!Array.isArray(body.links)) {
        return NextResponse.json(
          { error: "Les liens doivent être une liste." },
          { status: 400 }
        );
      }
      if (body.links.length > MAX_PROFILE_LINKS) {
        return NextResponse.json(
          { error: `Maximum ${MAX_PROFILE_LINKS} liens.` },
          { status: 400 }
        );
      }
      const parsed: { url: string; label: string | null }[] = [];
      for (const raw of body.links) {
        const url = String(raw?.url || "").trim();
        if (!url) continue;
        try {
          const u = new URL(url);
          if (u.protocol !== "http:" && u.protocol !== "https:") {
            return NextResponse.json(
              { error: "Chaque lien doit commencer par http:// ou https://." },
              { status: 400 }
            );
          }
        } catch {
          return NextResponse.json(
            { error: "URL de lien invalide." },
            { status: 400 }
          );
        }
        const label =
          raw?.label == null || !String(raw.label).trim()
            ? null
            : String(raw.label).trim().slice(0, 40);
        parsed.push({ url, label });
      }
      linksPayload = parsed;
    }

    if (Object.keys(data).length === 0 && linksPayload === null) {
      return NextResponse.json(
        { error: "Aucune modification." },
        { status: 400 }
      );
    }

    const userSelect = {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      phoneE164: true,
      createdAt: true,
    } as const;

    const user =
      Object.keys(data).length > 0
        ? await prisma.user.update({
            where: { id: session.id },
            data,
            select: userSelect,
          })
        : await prisma.user.findUniqueOrThrow({
            where: { id: session.id },
            select: userSelect,
          });

    if (linksPayload !== null) {
      await prisma.profileLink.deleteMany({ where: { userId: session.id } });
      if (linksPayload.length) {
        await prisma.profileLink.createMany({
          data: linksPayload.map((l, i) => ({
            userId: session.id,
            url: l.url,
            label: l.label,
            sortOrder: i,
          })),
        });
      }
    }

    // Rafraîchir le cookie JWT si username/avatar change
    await createSession({
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
    });

    const links = await prisma.profileLink.findMany({
      where: { userId: user.id },
      orderBy: { sortOrder: "asc" },
      select: { id: true, url: true, label: true },
    });

    return NextResponse.json({ user: { ...user, links } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        profileLinks: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, url: true, label: true },
        },
      },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }
    const { profileLinks, ...rest } = user;
    return NextResponse.json({ user: { ...rest, links: profileLinks } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
