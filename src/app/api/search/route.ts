import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const q = String(req.nextUrl.searchParams.get("q") || "").trim();
    if (q.length < 1) {
      return NextResponse.json({ users: [], videos: [] });
    }

    const session = await getSession();
    const term = q.replace(/^@/, "");

    const tagName = term.replace(/^#/, "").toLowerCase();
    const [users, videos, tagVideos] = await Promise.all([
      prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: term } },
            { displayName: { contains: term } },
          ],
        },
        take: 20,
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          isVerified: true,
          _count: { select: { followers: true, videos: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.video.findMany({
        where: {
          OR: [
            { caption: { contains: q } },
            { user: { username: { contains: term } } },
          ],
        },
        take: 24,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          _count: { select: { likes: true, comments: true, bookmarks: true } },
        },
      }),
      tagName
        ? prisma.video.findMany({
            where: {
              hashtags: { some: { hashtag: { name: tagName } } },
            },
            take: 24,
            orderBy: { createdAt: "desc" },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
              _count: { select: { likes: true, comments: true, bookmarks: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const videoMap = new Map<string, (typeof videos)[number]>();
    for (const v of [...tagVideos, ...videos]) videoMap.set(v.id, v);
    const mergedVideos = Array.from(videoMap.values());

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        bio: u.bio,
        followerCount: u._count.followers,
        videoCount: u._count.videos,
        isVerified: u.isVerified,
      })),
      hashtag: q.trim().startsWith('#') ? tagName : null,
      videos: mergedVideos.map((v) => ({
        id: v.id,
        caption: v.caption,
        videoUrl: v.videoUrl,
        coverUrl: v.coverUrl ?? null,
        createdAt: v.createdAt.toISOString(),
        likeCount: v._count.likes,
        commentCount: v._count.comments,
        bookmarkCount: v._count.bookmarks,
        user: v.user,
        mine: session?.id === v.userId,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
