import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const live = await prisma.live.findUnique({ where: { id: params.id } });
    if (!live || live.status !== "LIVE") {
      return NextResponse.json({ error: "Live terminé." }, { status: 400 });
    }
    const body = await req.json();
    const content = String(body.content || "").trim().slice(0, 200);
    if (!content) {
      return NextResponse.json({ error: "Message vide." }, { status: 400 });
    }
    const comment = await prisma.liveComment.create({
      data: { liveId: live.id, userId: session.id, content },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
    return NextResponse.json({
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        user: comment.user,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
