import { prisma } from "./prisma";
import type { SessionUser } from "./auth";
import type { FeedVideo } from "./types";

type VideoWithRelations = {
  id: string;
  caption: string;
  videoUrl: string;
  soundName: string | null;
  pinnedAt: Date | null;
  boostedUntil: Date | null;
  createdAt: Date;
  userId: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isPro: boolean;
    proUntil: Date | null;
  };
  likes: { id: string }[] | false;
  reposts: { id: string }[] | false;
  bookmarks: { id: string }[] | false;
  _count: { likes: number; comments: number; reposts: number; bookmarks: number };
};

function mapVideo(
  v: VideoWithRelations,
  session: SessionUser | null,
  repost?: FeedVideo["repost"]
): FeedVideo {
  return {
    id: v.id,
    caption: v.caption,
    videoUrl: v.videoUrl,
    soundName: v.soundName,
    createdAt: v.createdAt.toISOString(),
    likeCount: v._count.likes,
    commentCount: v._count.comments,
    repostCount: v._count.reposts,
    bookmarkCount: v._count.bookmarks,
    likedByMe: Array.isArray(v.likes) ? v.likes.length > 0 : false,
    repostedByMe: Array.isArray(v.reposts) ? v.reposts.length > 0 : false,
    bookmarkedByMe: Array.isArray(v.bookmarks) ? v.bookmarks.length > 0 : false,
    isOwner: session?.id === v.userId,
    pinned: Boolean(v.pinnedAt),
    boostedUntil: v.boostedUntil ? v.boostedUntil.toISOString() : null,
    user: {
      id: v.user.id,
      username: v.user.username,
      displayName: v.user.displayName,
      avatarUrl: v.user.avatarUrl,
      isPro: Boolean(
        v.user.isPro &&
          (!v.user.proUntil || v.user.proUntil.getTime() > Date.now())
      ),
    },
    repost: repost ?? null,
  };
}

const videoInclude = (session: SessionUser | null) => ({
  user: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      isPro: true,
      proUntil: true,
    },
  },
  likes: session
    ? { where: { userId: session.id }, select: { id: true } }
    : (false as const),
  reposts: session
    ? { where: { userId: session.id }, select: { id: true } }
    : (false as const),
  bookmarks: session
    ? { where: { userId: session.id }, select: { id: true } }
    : (false as const),
  _count: { select: { likes: true, comments: true, reposts: true, bookmarks: true } },
});

async function hiddenVideoIds(session: SessionUser | null): Promise<string[]> {
  if (!session) return [];
  const rows = await prisma.notInterested.findMany({
    where: { userId: session.id },
    select: { videoId: true },
  });
  return rows.map((r) => r.videoId);
}

async function buildMixedFeed(
  session: SessionUser | null,
  userIds?: string[]
): Promise<FeedVideo[]> {
  const hidden = await hiddenVideoIds(session);
  const videoWhere = {
    ...(userIds ? { userId: { in: userIds } } : {}),
    ...(hidden.length ? { id: { notIn: hidden } } : {}),
  };
  const repostWhere = {
    ...(userIds ? { userId: { in: userIds } } : {}),
    ...(hidden.length ? { videoId: { notIn: hidden } } : {}),
  };

  const [videos, reposts] = await Promise.all([
    prisma.video.findMany({
      where: videoWhere,
      orderBy: { createdAt: "desc" },
      include: videoInclude(session),
    }),
    prisma.repost.findMany({
      where: repostWhere,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, username: true } },
        video: { include: videoInclude(session) },
      },
    }),
  ]);

  type Item = { sortAt: number; feedKey: string; item: FeedVideo };

  const items: Item[] = [
    ...videos.map((v) => ({
      sortAt: v.createdAt.getTime(),
      feedKey: `v-${v.id}`,
      item: mapVideo(v as VideoWithRelations, session),
    })),
    ...reposts.map((r) => ({
      sortAt: r.createdAt.getTime(),
      feedKey: `r-${r.id}`,
      item: mapVideo(r.video as VideoWithRelations, session, {
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        user: r.user,
      }),
    })),
  ];

  const now = Date.now();
  function boostScore(item: FeedVideo): number {
    if (!item.boostedUntil) return 0;
    const t = new Date(item.boostedUntil).getTime();
    return t > now ? t : 0;
  }
  items.sort((a, b) => {
    const ba = boostScore(a.item);
    const bb = boostScore(b.item);
    if (ba !== bb) return bb - ba;
    return b.sortAt - a.sortAt;
  });
  return items.map((i) => i.item);
}

/** Fil mélangé : vidéos originales + republications, triés par date. */
export async function getMixedFeed(
  session: SessionUser | null
): Promise<FeedVideo[]> {
  return buildMixedFeed(session);
}

/**
 * Fil Abonnements : originales + republications des comptes suivis.
 * Retourne [] si l'utilisateur ne suit personne.
 */
export async function getFollowingFeed(
  session: SessionUser
): Promise<FeedVideo[]> {
  const follows = await prisma.follow.findMany({
    where: { followerId: session.id },
    select: { followingId: true },
  });
  const ids = follows.map((f) => f.followingId);
  if (ids.length === 0) return [];
  return buildMixedFeed(session, ids);
}
