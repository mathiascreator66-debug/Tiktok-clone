import { normalizeStoredGain } from "@/lib/media-edit";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/** List active stories for a user (by id or username). */
export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getSession();
    const now = new Date();
    const key = params.userId;

    const user = await prisma.user.findFirst({
      where: { OR: [{ id: key }, { username: key }] },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable." },
        { status: 404 }
      );
    }

    const stories = await prisma.story.findMany({
      where: { userId: user.id, expiresAt: { gt: now } },
      orderBy: { createdAt: "asc" },
      include: {
        views: session
          ? { where: { userId: session.id }, select: { id: true } }
          : false,
      },
    });

    return NextResponse.json({
      user,
      stories: stories.map((s) => ({
        id: s.id,
        mediaUrl: s.mediaUrl,
        caption: s.caption,
        soundName: s.soundName,
        soundUrl: s.soundUrl,
        originalVolume: normalizeStoredGain(s.originalVolume ?? 1),
        soundVolume: normalizeStoredGain(s.soundVolume ?? 1),
        soundTrimStartMs: s.soundTrimStartMs ?? 0,
        soundTrimEndMs: s.soundTrimEndMs ?? null,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        viewedByMe:
          session && Array.isArray(s.views) ? s.views.length > 0 : false,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
