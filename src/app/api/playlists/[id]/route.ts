import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const playlist = await prisma.playlist.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            video: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                  },
                },
                _count: { select: { likes: true, comments: true } },
              },
            },
          },
        },
      },
    });
    if (!playlist) {
      return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    }
    return NextResponse.json({
      playlist: {
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        coverUrl: playlist.coverUrl,
        createdAt: playlist.createdAt.toISOString(),
        user: playlist.user,
        videos: playlist.items.map((it, i) => ({
          id: it.video.id,
          caption: it.video.caption,
          videoUrl: it.video.videoUrl,
          coverUrl: it.video.coverUrl,
          soundName: it.video.soundName,
          soundUrl: it.video.soundUrl,
          allowDownload: it.video.allowDownload,
          likeCount: it.video._count.likes,
          commentCount: it.video._count.comments,
          sortOrder: it.sortOrder ?? i,
          user: it.video.user,
        })),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const playlist = await prisma.playlist.findUnique({ where: { id: params.id } });
    if (!playlist || playlist.userId !== session.id) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
    }
    const body = await req.json();
    const data: { title?: string; description?: string | null; coverUrl?: string | null } = {};
    if (body.title != null) data.title = String(body.title).trim().slice(0, 80);
    if ("description" in body) {
      data.description = body.description
        ? String(body.description).trim().slice(0, 300)
        : null;
    }
    if ("coverUrl" in body) data.coverUrl = body.coverUrl || null;
    const updated = await prisma.playlist.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ playlist: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const playlist = await prisma.playlist.findUnique({ where: { id: params.id } });
    if (!playlist || playlist.userId !== session.id) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
    }
    await prisma.playlist.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
