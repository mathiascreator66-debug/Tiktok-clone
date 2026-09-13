import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: { id: string } };

export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const live = await prisma.live.findUnique({ where: { id: params.id } });
    if (!live) {
      return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    }
    const existing = await prisma.liveLike.findUnique({
      where: { liveId_userId: { liveId: live.id, userId: session.id } },
    });
    if (existing) {
      return NextResponse.json({ liked: true });
    }
    await prisma.liveLike.create({
      data: { liveId: live.id, userId: session.id },
    });
    return NextResponse.json({ liked: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
