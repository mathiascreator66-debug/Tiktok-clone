import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    const live = await prisma.live.findUnique({
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
        comments: {
          orderBy: { createdAt: "asc" },
          take: 100,
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true },
            },
          },
        },
        _count: { select: { likes: true, comments: true } },
        likes: session
          ? { where: { userId: session.id }, select: { id: true } }
          : false,
      },
    });
    if (!live) {
      return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    }
    // bump peak viewers best-effort
    if (live.status === "LIVE") {
      await prisma.live
        .update({
          where: { id: live.id },
          data: { viewerPeak: { increment: 1 } },
        })
        .catch(() => {});
    }
    return NextResponse.json({
      live: {
        id: live.id,
        title: live.title,
        status: live.status,
        viewerPeak: live.viewerPeak + (live.status === "LIVE" ? 1 : 0),
        startedAt: live.startedAt.toISOString(),
        endedAt: live.endedAt?.toISOString() ?? null,
        likeCount: live._count.likes,
        likedByMe: Array.isArray(live.likes) ? live.likes.length > 0 : false,
        isOwner: session?.id === live.userId,
        user: live.user,
        comments: live.comments.map((c) => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt.toISOString(),
          user: c.user,
        })),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const live = await prisma.live.findUnique({ where: { id: params.id } });
    if (!live || live.userId !== session.id) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    if (body.status === "ENDED") {
      const ended = await prisma.live.update({
        where: { id: live.id },
        data: { status: "ENDED", endedAt: new Date() },
      });
      const durationSec = Math.max(
        0,
        Math.round(
          ((ended.endedAt?.getTime() || Date.now()) - ended.startedAt.getTime()) /
            1000
        )
      );
      return NextResponse.json({
        live: {
          id: ended.id,
          status: ended.status,
          viewerPeak: ended.viewerPeak,
          durationSec,
          endedAt: ended.endedAt?.toISOString(),
        },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
