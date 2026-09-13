import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { storyInteractRateLimit } from "@/lib/rate-limit";
import { STORY_QUICK_EMOJIS } from "@/lib/limits";
import { safeError } from "@/lib/safe-log";

const ALLOWED = new Set<string>(STORY_QUICK_EMOJIS);

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
    const session = await getSession();
    const story = await loadActiveStory(params.id);
    if (!story) {
      return NextResponse.json({ error: "Story introuvable." }, { status: 404 });
    }

    const reactions = await prisma.storyReaction.findMany({
      where: { storyId: story.id },
      select: { emoji: true, userId: true },
    });

    const byEmoji = new Map<string, { count: number; reactedByMe: boolean }>();
    for (const r of reactions) {
      const cur = byEmoji.get(r.emoji) ?? { count: 0, reactedByMe: false };
      cur.count += 1;
      if (session && r.userId === session.id) cur.reactedByMe = true;
      byEmoji.set(r.emoji, cur);
    }

    return NextResponse.json({
      reactions: Array.from(byEmoji.entries()).map(([emoji, v]) => ({
        emoji,
        count: v.count,
        reactedByMe: v.reactedByMe,
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
    const limited = storyInteractRateLimit(req, session.id, "reaction");
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Trop de réactions. Réessayez dans ${limited.retryAfterSec}s.` },
        { status: 429 }
      );
    }

    const story = await loadActiveStory(params.id);
    if (!story) {
      return NextResponse.json({ error: "Story introuvable." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const emoji = String(body.emoji || "").trim();
    if (!ALLOWED.has(emoji)) {
      return NextResponse.json({ error: "Emoji non autorisé." }, { status: 400 });
    }

    const existing = await prisma.storyReaction.findUnique({
      where: {
        userId_storyId_emoji: {
          userId: session.id,
          storyId: story.id,
          emoji,
        },
      },
    });

    if (existing) {
      await prisma.storyReaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ removed: true, emoji });
    }

    await prisma.storyReaction.create({
      data: {
        emoji,
        userId: session.id,
        storyId: story.id,
      },
    });

    return NextResponse.json({ removed: false, emoji });
  } catch (e) {
    safeError(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
