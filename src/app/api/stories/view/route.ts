import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }

    const body = await req.json();
    const storyId = String(body.storyId || "").trim();
    if (!storyId) {
      return NextResponse.json({ error: "storyId requis." }, { status: 400 });
    }

    const story = await prisma.story.findFirst({
      where: { id: storyId, expiresAt: { gt: new Date() } },
    });
    if (!story) {
      return NextResponse.json({ error: "Story introuvable." }, { status: 404 });
    }

    await prisma.storyView.upsert({
      where: {
        userId_storyId: { userId: session.id, storyId },
      },
      create: { userId: session.id, storyId },
      update: {},
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
