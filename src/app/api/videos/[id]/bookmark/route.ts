import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }

    const video = await prisma.video.findUnique({ where: { id: params.id } });
    if (!video) {
      return NextResponse.json({ error: "Vidéo introuvable." }, { status: 404 });
    }

    const existing = await prisma.bookmark.findUnique({
      where: { userId_videoId: { userId: session.id, videoId: params.id } },
    });

    if (existing) {
      await prisma.bookmark.delete({ where: { id: existing.id } });
    } else {
      await prisma.bookmark.create({
        data: { userId: session.id, videoId: params.id },
      });
    }

    const bookmarkCount = await prisma.bookmark.count({
      where: { videoId: params.id },
    });

    return NextResponse.json({
      bookmarked: !existing,
      bookmarkCount,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
