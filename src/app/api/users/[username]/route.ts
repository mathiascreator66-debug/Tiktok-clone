import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getSession();
    const user = await prisma.user.findUnique({
      where: { username: params.username.toLowerCase() },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
        videos: {
          orderBy: { createdAt: "desc" },
          include: {
            _count: { select: { likes: true, comments: true } },
            likes: session
              ? { where: { userId: session.id }, select: { id: true } }
              : false,
          },
        },
        _count: { select: { videos: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
        videoCount: user._count.videos,
        videos: user.videos.map((v) => ({
          id: v.id,
          caption: v.caption,
          videoUrl: v.videoUrl,
          createdAt: v.createdAt.toISOString(),
          likeCount: v._count.likes,
          commentCount: v._count.comments,
          likedByMe: Array.isArray(v.likes) ? v.likes.length > 0 : false,
        })),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
