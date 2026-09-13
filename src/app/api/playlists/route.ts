import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const mine = req.nextUrl.searchParams.get("mine") === "1";
    const username = req.nextUrl.searchParams.get("username");

    let userId: string | null = null;
    if (mine) {
      if (!session) {
        return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
      }
      userId = session.id;
    } else if (username) {
      const u = await prisma.user.findUnique({
        where: { username: username.toLowerCase() },
        select: { id: true },
      });
      if (!u) return NextResponse.json({ playlists: [] });
      userId = u.id;
    } else if (session) {
      userId = session.id;
    } else {
      return NextResponse.json({ playlists: [] });
    }

    const playlists = await prisma.playlist.findMany({
      where: { userId: userId! },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { items: true } },
        items: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          include: { video: { select: { coverUrl: true, videoUrl: true } } },
        },
      },
    });

    return NextResponse.json({
      playlists: playlists.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        coverUrl:
          p.coverUrl ||
          p.items[0]?.video.coverUrl ||
          p.items[0]?.video.videoUrl ||
          null,
        itemCount: p._count.items,
        createdAt: p.createdAt.toISOString(),
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
    const body = await req.json();
    const title = String(body.title || "").trim().slice(0, 80);
    const description = body.description
      ? String(body.description).trim().slice(0, 300)
      : null;
    const videoId = body.videoId ? String(body.videoId) : null;
    if (!title) {
      return NextResponse.json({ error: "Titre requis." }, { status: 400 });
    }

    let coverUrl: string | null = null;
    if (videoId) {
      const v = await prisma.video.findUnique({
        where: { id: videoId },
        select: { id: true, coverUrl: true, videoUrl: true },
      });
      if (!v) {
        return NextResponse.json({ error: "Vidéo introuvable." }, { status: 404 });
      }
      coverUrl = v.coverUrl || v.videoUrl;
    }

    const playlist = await prisma.playlist.create({
      data: {
        userId: session.id,
        title,
        description,
        coverUrl,
        ...(videoId
          ? { items: { create: { videoId, sortOrder: 0 } } }
          : {}),
      },
    });

    return NextResponse.json({
      playlist: {
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        coverUrl: playlist.coverUrl,
        itemCount: videoId ? 1 : 0,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
