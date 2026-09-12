import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, getSession } from "@/lib/auth";

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
    } = {};

    if ("bio" in body) {
      const bio = body.bio == null ? null : String(body.bio).trim();
      if (bio && bio.length > 300) {
        return NextResponse.json(
          { error: "La bio est limitée à 300 caractères." },
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

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Aucune modification." },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: session.id },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
      },
    });

    // Rafraîchir le cookie JWT si username/avatar change
    await createSession({
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
    });

    return NextResponse.json({ user });
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
      },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
