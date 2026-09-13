import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { MAX_PINNED_VIDEOS } from "@/lib/limits";

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
    if (video.userId !== session.id) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
    }

    if (video.pinnedAt) {
      await prisma.video.update({
        where: { id: video.id },
        data: { pinnedAt: null },
      });
      return NextResponse.json({ pinned: false });
    }

    const pinnedCount = await prisma.video.count({
      where: { userId: session.id, pinnedAt: { not: null } },
    });
    if (pinnedCount >= MAX_PINNED_VIDEOS) {
      return NextResponse.json(
        { error: `Vous pouvez épingler jusqu’à ${MAX_PINNED_VIDEOS} vidéos.` },
        { status: 400 }
      );
    }

    await prisma.video.update({
      where: { id: video.id },
      data: { pinnedAt: new Date() },
    });
    return NextResponse.json({ pinned: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
