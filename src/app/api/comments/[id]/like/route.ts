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

    const comment = await prisma.comment.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!comment) {
      return NextResponse.json(
        { error: "Commentaire introuvable." },
        { status: 404 }
      );
    }

    const existing = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: { userId: session.id, commentId: params.id },
      },
    });

    if (existing) {
      await prisma.commentLike.delete({ where: { id: existing.id } });
    } else {
      await prisma.commentLike.create({
        data: { userId: session.id, commentId: params.id },
      });
    }

    const likeCount = await prisma.commentLike.count({
      where: { commentId: params.id },
    });

    return NextResponse.json({
      liked: !existing,
      likeCount,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
