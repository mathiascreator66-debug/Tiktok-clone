import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
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
    const videoId = String(body.videoId || "");
    if (!videoId) {
      return NextResponse.json({ error: "videoId requis." }, { status: 400 });
    }
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, coverUrl: true, videoUrl: true },
    });
    if (!video) {
      return NextResponse.json({ error: "Vidéo introuvable." }, { status: 404 });
    }
    const existing = await prisma.playlistItem.findUnique({
      where: {
        playlistId_videoId: { playlistId: params.id, videoId },
      },
    });
    if (existing) {
      return NextResponse.json({ ok: true, already: true });
    }
    const max = await prisma.playlistItem.aggregate({
      where: { playlistId: params.id },
      _max: { sortOrder: true },
    });
    await prisma.playlistItem.create({
      data: {
        playlistId: params.id,
        videoId,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });
    if (!playlist.coverUrl) {
      await prisma.playlist.update({
        where: { id: params.id },
        data: { coverUrl: video.coverUrl || video.videoUrl },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(
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
    const videoId = req.nextUrl.searchParams.get("videoId");
    if (!videoId) {
      return NextResponse.json({ error: "videoId requis." }, { status: 400 });
    }
    await prisma.playlistItem.deleteMany({
      where: { playlistId: params.id, videoId },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
