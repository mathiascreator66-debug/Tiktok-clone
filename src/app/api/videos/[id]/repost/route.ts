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

    const existing = await prisma.repost.findUnique({
      where: {
        userId_videoId: { userId: session.id, videoId: params.id },
      },
    });

    if (existing) {
      const repostCount = await prisma.repost.count({
        where: { videoId: params.id },
      });
      return NextResponse.json({
        reposted: true,
        repostCount,
        message: "Déjà republie.",
      });
    }

    await prisma.repost.create({
      data: { userId: session.id, videoId: params.id },
    });

    const repostCount = await prisma.repost.count({
      where: { videoId: params.id },
    });
    return NextResponse.json({ reposted: true, repostCount });
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

    const existing = await prisma.repost.findUnique({
      where: {
        userId_videoId: { userId: session.id, videoId: params.id },
      },
    });

    if (existing) {
      await prisma.repost.delete({ where: { id: existing.id } });
    }

    const repostCount = await prisma.repost.count({
      where: { videoId: params.id },
    });
    return NextResponse.json({ reposted: false, repostCount });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
