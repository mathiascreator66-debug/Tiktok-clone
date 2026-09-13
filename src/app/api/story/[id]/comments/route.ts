import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { storyInteractRateLimit } from "@/lib/rate-limit";
import { STORY_COMMENT_MAX } from "@/lib/limits";
import { safeError } from "@/lib/safe-log";

async function loadActiveStory(id: string) {
  const now = new Date();
  return prisma.story.findFirst({
    where: { id, expiresAt: { gt: now } },
    select: { id: true, userId: true },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const story = await loadActiveStory(params.id);
    if (!story) {
      return NextResponse.json({ error: "Story introuvable." }, { status: 404 });
    }
    const comments = await prisma.storyComment.findMany({
      where: { storyId: story.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true },
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
    safeError(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const limited = storyInteractRateLimit(req, session.id, "comment");
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Trop de commentaires. Réessayez dans ${limited.retryAfterSec}s.` },
        { status: 429 }
      );
    }

    const story = await loadActiveStory(params.id);
    if (!story) {
      return NextResponse.json({ error: "Story introuvable." }, { status: 404 });
    }
    if (story.userId === session.id) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas commenter votre propre story ici." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const content = String(body.content || "").trim().slice(0, STORY_COMMENT_MAX);
    if (!content) {
      return NextResponse.json({ error: "Commentaire vide." }, { status: 400 });
    }

    const comment = await prisma.storyComment.create({
      data: {
        content,
        userId: session.id,
        storyId: story.id,
      },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true },
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
    safeError(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
