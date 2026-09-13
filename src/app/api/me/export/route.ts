import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        videos: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            caption: true,
            videoUrl: true,
            createdAt: true,
            _count: { select: { likes: true, comments: true, reposts: true } },
          },
        },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 500,
          select: {
            id: true,
            content: true,
            createdAt: true,
            videoId: true,
          },
        },
        following: {
          select: {
            createdAt: true,
            following: { select: { username: true, displayName: true } },
          },
        },
        followers: {
          select: {
            createdAt: true,
            follower: { select: { username: true, displayName: true } },
          },
        },
        stories: {
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true,
            mediaUrl: true,
            caption: true,
            createdAt: true,
            expiresAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      profile: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        createdAt: user.createdAt.toISOString(),
      },
      videos: user.videos.map((v) => ({
        id: v.id,
        caption: v.caption,
        videoUrl: v.videoUrl,
        createdAt: v.createdAt.toISOString(),
        likeCount: v._count.likes,
        commentCount: v._count.comments,
        repostCount: v._count.reposts,
      })),
      comments: user.comments.map((c) => ({
        id: c.id,
        content: c.content,
        videoId: c.videoId,
        createdAt: c.createdAt.toISOString(),
      })),
      following: user.following.map((f) => ({
        username: f.following.username,
        displayName: f.following.displayName,
        since: f.createdAt.toISOString(),
      })),
      followers: user.followers.map((f) => ({
        username: f.follower.username,
        displayName: f.follower.displayName,
        since: f.createdAt.toISOString(),
      })),
      stories: user.stories.map((s) => ({
        id: s.id,
        mediaUrl: s.mediaUrl,
        caption: s.caption,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
      })),
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="afrivoix-${user.username}-export.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
