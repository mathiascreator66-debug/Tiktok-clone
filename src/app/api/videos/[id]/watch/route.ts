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

    const video = await prisma.video.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!video) {
      return NextResponse.json({ error: "Vidéo introuvable." }, { status: 404 });
    }

    await prisma.watchEvent.create({
      data: { userId: session.id, videoId: params.id },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
