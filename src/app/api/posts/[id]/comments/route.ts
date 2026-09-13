import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const comments = await prisma.postComment.findMany({
      where: { postId: params.id },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, displayName: true },
        },
      },
    });
    return NextResponse.json({
      comments: comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        user: c.user,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const body = await req.json();
    const content = String(body.content || "").trim().slice(0, 1000);
    if (!content) {
      return NextResponse.json({ error: "Commentaire vide." }, { status: 400 });
    }
    const comment = await prisma.postComment.create({
      data: { postId: params.id, userId: session.id, content },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, displayName: true },
        },
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
