import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const lives = await prisma.live.findMany({
      where: { status: "LIVE" },
      orderBy: { startedAt: "desc" },
      take: 30,
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
    });
    return NextResponse.json({
      lives: lives.map((l) => ({
        id: l.id,
        title: l.title,
        status: l.status,
        viewerPeak: l.viewerPeak,
        startedAt: l.startedAt.toISOString(),
        likeCount: l._count.likes,
        commentCount: l._count.comments,
        user: l.user,
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
    // End any existing live for this user
    await prisma.live.updateMany({
      where: { userId: session.id, status: "LIVE" },
      data: { status: "ENDED", endedAt: new Date() },
    });
    const body = await req.json().catch(() => ({}));
    const title = String(body.title || "En direct").trim().slice(0, 80);
    const live = await prisma.live.create({
      data: {
        userId: session.id,
        title: title || "En direct",
        status: "LIVE",
      },
    });
    return NextResponse.json({
      live: {
        id: live.id,
        title: live.title,
        status: live.status,
        startedAt: live.startedAt.toISOString(),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
